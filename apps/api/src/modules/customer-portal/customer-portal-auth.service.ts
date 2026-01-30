import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash, randomInt } from 'crypto';
import { PrismaService } from '../../config/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { EmailService } from '../email/email.service';

const CODE_EXPIRY_MINUTES = 10;
const MAGIC_LINK_EXPIRY_HOURS = 24;
const SESSION_EXPIRY_DAYS = 30;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

@Injectable()
export class CustomerPortalAuthService {
  private readonly logger = new Logger(CustomerPortalAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Request OTP code via SMS
   */
  async requestOtpCode(phone: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    return this.prisma.withTenantContext(tenantId, async () => {
      // Find customer by phone
      const customer = await this.prisma.customer.findFirst({
        where: { phone, tenantId },
      });

      if (!customer) {
        // Don't reveal if customer exists
        return { success: true, message: 'If this number is registered, you will receive a code' };
      }

      // Check for lockout
      const auth = await this.prisma.customerAuth.findUnique({
        where: { customerId: customer.id },
      });

      if (auth?.lockedUntil && auth.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((auth.lockedUntil.getTime() - Date.now()) / 60000);
        throw new BadRequestException(`Account locked. Try again in ${minutesLeft} minutes`);
      }

      // Generate cryptographically secure 6-digit code
      const code = randomInt(100000, 999999).toString();
      const codeExpiry = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60000);

      // Upsert auth record
      await this.prisma.customerAuth.upsert({
        where: { customerId: customer.id },
        create: {
          customerId: customer.id,
          tenantId,
          phone: customer.phone,
          email: customer.email,
          verificationCode: this.hashCode(code),
          codeExpiry,
        },
        update: {
          verificationCode: this.hashCode(code),
          codeExpiry,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });

      // Send SMS
      try {
        await this.smsService.sendSms(
          phone,
          `Your verification code is: ${code}. It expires in ${CODE_EXPIRY_MINUTES} minutes.`,
          { tenantId, skipOptOutCheck: true },
        );
      } catch (error) {
        this.logger.error(`Failed to send OTP SMS: ${error.message}`);
        // Still return success to not reveal if number exists
      }

      this.logger.log(`OTP sent to customer ${customer.id}`);
      return { success: true, message: 'Verification code sent' };
    });
  }

  /**
   * Verify OTP code and create session
   */
  async verifyOtpCode(
    phone: string,
    code: string,
    tenantId: string,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ token: string; expiresAt: Date }> {
    return this.prisma.withTenantContext(tenantId, async () => {
      const customer = await this.prisma.customer.findFirst({
        where: { phone, tenantId },
        include: { auth: true },
      });

      if (!customer?.auth) {
        throw new UnauthorizedException('Invalid code');
      }

      const auth = customer.auth;

      // Check lockout
      if (auth.lockedUntil && auth.lockedUntil > new Date()) {
        throw new UnauthorizedException('Account temporarily locked');
      }

      // Check expiry
      if (!auth.codeExpiry || auth.codeExpiry < new Date()) {
        throw new UnauthorizedException('Code expired');
      }

      // Verify code
      if (!auth.verificationCode || auth.verificationCode !== this.hashCode(code)) {
        // Increment failed attempts
        const failedAttempts = auth.failedAttempts + 1;
        const lockedUntil =
          failedAttempts >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60000)
            : null;

        await this.prisma.customerAuth.update({
          where: { id: auth.id },
          data: { failedAttempts, lockedUntil },
        });

        if (lockedUntil) {
          throw new UnauthorizedException('Too many attempts. Account locked.');
        }
        throw new UnauthorizedException('Invalid code');
      }

      // Clear code and create session
      await this.prisma.customerAuth.update({
        where: { id: auth.id },
        data: {
          verificationCode: null,
          codeExpiry: null,
          isVerified: true,
          lastLoginAt: new Date(),
          failedAttempts: 0,
          lockedUntil: null,
        },
      });

      return this.createSession(customer.id, auth.id, metadata);
    });
  }

  /**
   * Request magic link via email
   */
  async requestMagicLink(email: string, tenantId: string): Promise<{ success: boolean }> {
    return this.prisma.withTenantContext(tenantId, async () => {
      const customer = await this.prisma.customer.findFirst({
        where: { email, tenantId },
      });

      if (!customer) {
        return { success: true }; // Don't reveal if customer exists
      }

      // Generate token
      const token = randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + MAGIC_LINK_EXPIRY_HOURS * 3600000);

      await this.prisma.customerAuth.upsert({
        where: { customerId: customer.id },
        create: {
          customerId: customer.id,
          tenantId,
          phone: customer.phone,
          email: customer.email,
          magicLinkToken: this.hashToken(token),
          magicLinkExpiry: expiry,
        },
        update: {
          magicLinkToken: this.hashToken(token),
          magicLinkExpiry: expiry,
        },
      });

      const baseUrl = this.configService.get('APP_URL') || 'http://localhost:3000';
      const link = `${baseUrl}/customer/login?token=${token}`;
      await this.emailService.sendMagicLink(email, link);
      this.logger.log(`Magic link issued for ${email}`);

      return { success: true };
    });
  }

  /**
   * Verify magic link token
   */
  async verifyMagicLink(
    token: string,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ token: string; expiresAt: Date }> {
    return this.prisma.withSystemContext(async () => {
      const hashedToken = this.hashToken(token);

      const auth = await this.prisma.customerAuth.findFirst({
        where: {
          magicLinkToken: hashedToken,
          magicLinkExpiry: { gt: new Date() },
        },
      });

      if (!auth) {
        throw new UnauthorizedException('Invalid or expired link');
      }

      // Clear token and create session
      await this.prisma.customerAuth.update({
        where: { id: auth.id },
        data: {
          magicLinkToken: null,
          magicLinkExpiry: null,
          isVerified: true,
          lastLoginAt: new Date(),
        },
      });

      return this.createSession(auth.customerId, auth.id, metadata);
    });
  }

  /**
   * Validate session token
   */
  async validateSession(token: string): Promise<{
    customerId: string;
    tenantId: string;
    customer: any;
  } | null> {
    return this.prisma.withSystemContext(async () => {
      const hashedToken = this.hashToken(token);

      const session = await this.prisma.customerSession.findFirst({
        where: {
          token: hashedToken,
          expiresAt: { gt: new Date() },
        },
        include: {
          customerAuth: {
            include: {
              customer: true,
            },
          },
        },
      });

      if (!session) {
        return null;
      }

      return {
        customerId: session.customerId,
        tenantId: session.customerAuth.tenantId,
        customer: session.customerAuth.customer,
      };
    });
  }

  /**
   * Logout - invalidate session
   */
  async logout(token: string): Promise<void> {
    await this.prisma.withSystemContext(async () => {
      const hashedToken = this.hashToken(token);

      await this.prisma.customerSession.deleteMany({
        where: { token: hashedToken },
      });
    });
  }

  /**
   * Logout all sessions for a customer
   */
  async logoutAll(customerId: string): Promise<void> {
    await this.prisma.withSystemContext(async () => {
      await this.prisma.customerSession.deleteMany({
        where: { customerId },
      });
    });
  }

  // Private helpers

  private async createSession(
    customerId: string,
    customerAuthId: string,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 3600000);

    await this.prisma.customerSession.create({
      data: {
        customerId,
        customerAuthId,
        token: this.hashToken(token),
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
