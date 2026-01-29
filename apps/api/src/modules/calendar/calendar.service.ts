import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CircuitBreakerService } from '../../common/circuit-breaker/circuit-breaker.service';

@Injectable()
export class CalendarService implements OnModuleInit {
  private readonly logger = new Logger(CalendarService.name);
  private calendarBreaker: any | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly circuitBreakerService: CircuitBreakerService,
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
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state: tenantId,
      prompt: 'consent',
    });
  }

  async handleCallback(code: string, tenantId: string) {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token || !tokens.access_token) {
      throw new BadRequestException('Failed to get tokens from Google');
    }

    await this.prisma.calendarIntegration.upsert({
      where: { tenantId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
      },
      create: {
        tenantId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
      },
    });

    return { success: true, message: 'Calendar connected successfully' };
  }

  async getIntegration(tenantId: string) {
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
  }

  async disconnect(tenantId: string) {
    await this.prisma.calendarIntegration.delete({
      where: { tenantId },
    });
    return { success: true, message: 'Calendar disconnected' };
  }

  async updateSettings(
    tenantId: string,
    data: { syncEnabled?: boolean; calendarId?: string },
  ) {
    return this.prisma.calendarIntegration.update({
      where: { tenantId },
      data,
    });
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
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { customer: true, service: true, tenant: true },
    });

    if (!appointment) return null;

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
  }

  async deleteCalendarEvent(appointmentId: string): Promise<boolean> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment?.googleCalendarEventId) return false;

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
  }

  async listCalendars(tenantId: string) {
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
