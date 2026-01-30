import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CircuitBreakerService } from '../../common/circuit-breaker/circuit-breaker.service';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const STATE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class CalendarService implements OnModuleInit {
  private readonly logger = new Logger(CalendarService.name);
  private calendarBreaker: any | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.calendarBreaker = this.circuitBreakerService.createBreaker(
      'google-calendar',
      async <T>(fn: () => Promise<T>) => fn(),
      {
        timeout: 15000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000,
      },
    );
  }

  private async callGoogleApi<T>(fn: () => Promise<T>): Promise<T> {
    if (this.calendarBreaker) {
      return this.calendarBreaker.fire(fn) as Promise<T>;
    }
    return fn();
  }

  private getOAuth2Client(): OAuth2Client {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  getAuthUrl(tenantId: string): string {
    const oauth2Client = this.getOAuth2Client();
    const state = this.encodeState(tenantId);
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state,
      prompt: 'consent',
    });
  }

  async handleCallback(code: string, state: string) {
    if (!state) {
      throw new BadRequestException('Missing OAuth state');
    }

    const tenantId = this.decodeState(state);
    if (!tenantId) {
      throw new BadRequestException('Missing tenant state');
    }

    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    const accessToken = tokens.access_token || null;
    const refreshToken = tokens.refresh_token || null;

    if (!accessToken || !refreshToken) {
      throw new BadRequestException('Failed to get tokens from Google');
    }

    await this.prisma.withTenantContext(tenantId, () =>
      this.prisma.calendarIntegration.upsert({
        where: { tenantId },
        update: {
          accessToken,
          refreshToken,
          expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
        },
        create: {
          tenantId,
          accessToken,
          refreshToken,
          expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
        },
      }),
    );

    return { success: true, message: 'Calendar connected successfully' };
  }

  private getStateSecret(): string | null {
    const secret = this.configService.get<string>('CALENDAR_STATE_SECRET');
    if (secret) {
      return secret;
    }

    const isProduction = this.configService.get('NODE_ENV') === 'production';
    if (isProduction) {
      throw new Error('CALENDAR_STATE_SECRET is required in production');
    }

    return null;
  }

  private encodeState(tenantId: string): string {
    const secret = this.getStateSecret();
    if (!secret) {
      return tenantId;
    }

    const payload = {
      tenantId,
      iat: Date.now(),
      nonce: randomBytes(8).toString('hex'),
    };
    const payloadString = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.signState(payloadString, secret);
    return `${payloadString}.${signature}`;
  }

  private decodeState(state: string): string {
    const secret = this.getStateSecret();
    if (!secret) {
      return state;
    }

    const [payloadString, signature] = state.split('.');
    if (!payloadString || !signature) {
      throw new BadRequestException('Invalid OAuth state');
    }

    const expected = this.signState(payloadString, secret);
    if (!this.safeEqual(signature, expected)) {
      throw new BadRequestException('Invalid OAuth state signature');
    }

    let payload: { tenantId?: string; iat?: number };
    try {
      payload = JSON.parse(Buffer.from(payloadString, 'base64url').toString('utf8'));
    } catch (error) {
      throw new BadRequestException('Invalid OAuth state payload');
    }

    if (!payload.tenantId) {
      throw new BadRequestException('Invalid OAuth state payload');
    }

    if (!payload.iat || Date.now() - payload.iat > STATE_TTL_MS) {
      throw new BadRequestException('OAuth state expired');
    }

    return payload.tenantId;
  }

  private signState(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('base64url');
  }

  private safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) {
      return false;
    }
    return timingSafeEqual(aBuf, bBuf);
  }

  async getIntegration(tenantId: string) {
    return this.prisma.withTenantContext(tenantId, async () => {
      const integration = await this.prisma.calendarIntegration.findUnique({
        where: { tenantId },
      });
      if (!integration) {
        return { connected: false };
      }
      return {
        connected: true,
        syncEnabled: integration.syncEnabled,
        calendarId: integration.calendarId,
      };
    });
  }

  async disconnect(tenantId: string) {
    return this.prisma.withTenantContext(tenantId, async () => {
      await this.prisma.calendarIntegration.delete({
        where: { tenantId },
      });
      return { success: true, message: 'Calendar disconnected' };
    });
  }

  async updateSettings(
    tenantId: string,
    data: { syncEnabled?: boolean; calendarId?: string },
  ) {
    return this.prisma.withTenantContext(tenantId, () =>
      this.prisma.calendarIntegration.update({
        where: { tenantId },
        data,
      }),
    );
  }

  private async getAuthenticatedClient(
    tenantId: string,
  ): Promise<OAuth2Client | null> {
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: { tenantId },
    });

    if (!integration) return null;

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
      expiry_date: integration.expiresAt.getTime(),
    });

    // Refresh if expired
    if (new Date() >= integration.expiresAt) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await this.prisma.calendarIntegration.update({
        where: { tenantId },
        data: {
          accessToken: credentials.access_token!,
          expiresAt: new Date(credentials.expiry_date || Date.now() + 3600000),
        },
      });
    }

    return oauth2Client;
  }

  async syncAppointmentToCalendar(appointmentId: string): Promise<string | null> {
    const appointment = await this.prisma.withSystemContext(() =>
      this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { customer: true, service: true, tenant: true },
      }),
    );

    if (!appointment) return null;

    return this.prisma.withTenantContext(appointment.tenantId, async () => {
      const integration = await this.prisma.calendarIntegration.findUnique({
        where: { tenantId: appointment.tenantId },
      });

      if (!integration?.syncEnabled) return null;

      const oauth2Client = await this.getAuthenticatedClient(appointment.tenantId);
      if (!oauth2Client) return null;

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendarId = integration.calendarId || 'primary';

      const endTime = new Date(appointment.scheduledAt);
      endTime.setMinutes(endTime.getMinutes() + appointment.duration);

      const eventData: calendar_v3.Schema$Event = {
        summary: `${appointment.service?.name || 'Appointment'} - ${appointment.customer.name}`,
        description: this.buildEventDescription(appointment),
        start: {
          dateTime: appointment.scheduledAt.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      };

      try {
        if (appointment.googleCalendarEventId) {
          // Update existing event
          const response = await this.callGoogleApi(() =>
            calendar.events.update({
              calendarId,
              eventId: appointment.googleCalendarEventId!,
              requestBody: eventData,
            }),
          );
          return response.data.id || null;
        } else {
          // Create new event
          const response = await this.callGoogleApi(() =>
            calendar.events.insert({
              calendarId,
              requestBody: eventData,
            }),
          );

          // Store event ID
          await this.prisma.appointment.update({
            where: { id: appointmentId },
            data: { googleCalendarEventId: response.data.id },
          });

          return response.data.id || null;
        }
      } catch (error) {
        if (error.message?.includes('Breaker is open')) {
          this.logger.warn(`Calendar circuit breaker open, skipping sync for ${appointmentId}`);
        } else {
          this.logger.error(`Failed to sync appointment ${appointmentId}:`, error);
        }
        return null;
      }
    });
  }

  async deleteCalendarEvent(appointmentId: string): Promise<boolean> {
    const appointment = await this.prisma.withSystemContext(() =>
      this.prisma.appointment.findUnique({
        where: { id: appointmentId },
      }),
    );

    if (!appointment?.googleCalendarEventId) return false;

    return this.prisma.withTenantContext(appointment.tenantId, async () => {
      const integration = await this.prisma.calendarIntegration.findUnique({
        where: { tenantId: appointment.tenantId },
      });

      if (!integration) return false;

      const oauth2Client = await this.getAuthenticatedClient(appointment.tenantId);
      if (!oauth2Client) return false;

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendarId = integration.calendarId || 'primary';

      try {
        await this.callGoogleApi(() =>
          calendar.events.delete({
            calendarId,
            eventId: appointment.googleCalendarEventId!,
          }),
        );
        return true;
      } catch (error) {
        if (error.message?.includes('Breaker is open')) {
          this.logger.warn('Calendar circuit breaker open, skipping delete');
        } else {
          this.logger.error(`Failed to delete calendar event:`, error);
        }
        return false;
      }
    });
  }

  async listCalendars(tenantId: string) {
    return this.prisma.withTenantContext(tenantId, async () => {
      const oauth2Client = await this.getAuthenticatedClient(tenantId);
      if (!oauth2Client) {
        throw new BadRequestException('Calendar not connected');
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      try {
        const response = await this.callGoogleApi(() => calendar.calendarList.list());
        return (response.data.items || []).map((cal) => ({
          id: cal.id,
          summary: cal.summary,
          primary: cal.primary,
        }));
      } catch (error) {
        if (error.message?.includes('Breaker is open')) {
          throw new BadRequestException('Calendar service temporarily unavailable. Please try again later.');
        }
        throw error;
      }
    });
  }

  private buildEventDescription(appointment: {
    customer: { name: string; phone: string; email: string | null };
    service: { name: string } | null;
    notes: string | null;
    confirmationCode: string | null;
  }): string {
    const lines = [
      `Customer: ${appointment.customer.name}`,
      `Phone: ${appointment.customer.phone}`,
    ];

    if (appointment.customer.email) {
      lines.push(`Email: ${appointment.customer.email}`);
    }

    if (appointment.confirmationCode) {
      lines.push(`Confirmation: ${appointment.confirmationCode}`);
    }

    if (appointment.notes) {
      lines.push(`\nNotes: ${appointment.notes}`);
    }

    return lines.join('\n');
  }
}
