import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  Headers,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { CustomerPortalAuthService } from './customer-portal-auth.service';
import { CustomerPortalGuard } from './customer-portal.guard';
import { PrismaService } from '../../config/prisma/prisma.service';

@Controller('customer-portal')
export class CustomerPortalController {
  constructor(
    private readonly authService: CustomerPortalAuthService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================
  // Authentication Endpoints (Public)
  // ============================================

  // Rate limit: 3 OTP requests per minute per IP
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('auth/otp/request')
  async requestOtp(@Body() body: { phone: string; tenantSlug: string }) {
    // Look up tenant by slug
    const tenant = await this.getTenantBySlug(body.tenantSlug);

    if (!tenant) {
      return { success: true, message: 'If this number is registered, you will receive a code' };
    }

    return this.authService.requestOtpCode(body.phone, tenant.id);
  }

  // Rate limit: 5 OTP verification attempts per 5 minutes per IP
  @Public()
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @Post('auth/otp/verify')
  async verifyOtp(
    @Body() body: { phone: string; code: string; tenantSlug: string },
    @Headers('user-agent') userAgent: string,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tenant = await this.getTenantBySlug(body.tenantSlug);

    if (!tenant) {
      // SECURITY: Don't reveal tenant validation logic
      throw new NotFoundException('Resource not found');
    }

    const { token, expiresAt } = await this.authService.verifyOtpCode(
      body.phone,
      body.code,
      tenant.id,
      { userAgent, ipAddress: req.ip },
    );

    // Set cookie
    res.cookie('customer_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    return { success: true, token, expiresAt };
  }

  @Public()
  @Post('auth/magic-link/request')
  async requestMagicLink(@Body() body: { email: string; tenantSlug: string }) {
    const tenant = await this.getTenantBySlug(body.tenantSlug);

    if (!tenant) {
      return { success: true };
    }

    return this.authService.requestMagicLink(body.email, tenant.id);
  }

  @Public()
  @Post('auth/magic-link/verify')
  async verifyMagicLink(
    @Body() body: { token: string },
    @Headers('user-agent') userAgent: string,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, expiresAt } = await this.authService.verifyMagicLink(body.token, {
      userAgent,
      ipAddress: req.ip,
    });

    res.cookie('customer_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    return { success: true, token, expiresAt };
  }

  @Public()
  @Post('auth/logout')
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.customer_session || req.headers.authorization?.split(' ')[1];

    if (token) {
      await this.authService.logout(token);
    }

    res.clearCookie('customer_session');
    return { success: true };
  }

  private async getTenantBySlug(tenantSlug: string) {
    return this.prisma.withSystemContext(() =>
      this.prisma.tenant.findUnique({
        where: { slug: tenantSlug },
      }),
    );
  }

  // ============================================
  // Protected Customer Portal Endpoints
  // ============================================

  @UseGuards(CustomerPortalGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return {
      customer: req.customer,
      tenantId: req.tenantId,
    };
  }

  @UseGuards(CustomerPortalGuard)
  @Get('appointments')
  async getAppointments(@Request() req, @Query('status') status?: string) {
    const customerId = req.customerId;
    const tenantId = req.tenantId;

    // SECURITY: Always enforce tenant isolation
    return this.prisma.appointment.findMany({
      where: {
        customerId,
        tenantId,
        ...(status && { status: status as any }),
      },
      include: {
        service: { select: { name: true, durationMinutes: true } },
        assignedUser: { select: { name: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });
  }

  @UseGuards(CustomerPortalGuard)
  @Get('appointments/:id')
  async getAppointment(@Request() req, @Param('id') id: string) {
    const customerId = req.customerId;
    const tenantId = req.tenantId;

    const appointment = await this.prisma.appointment.findFirst({
      where: { id, customerId, tenantId },
      include: {
        service: true,
        assignedUser: { select: { name: true, phone: true } },
        job: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  @UseGuards(CustomerPortalGuard)
  @Get('invoices')
  async getInvoices(@Request() req, @Query('status') status?: string) {
    const customerId = req.customerId;
    const tenantId = req.tenantId;

    return this.prisma.invoice.findMany({
      where: {
        customerId,
        tenantId,
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @UseGuards(CustomerPortalGuard)
  @Get('invoices/:id')
  async getInvoice(@Request() req, @Param('id') id: string) {
    const customerId = req.customerId;
    const tenantId = req.tenantId;

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, customerId, tenantId },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  @UseGuards(CustomerPortalGuard)
  @Get('quotes')
  async getQuotes(@Request() req) {
    const customerId = req.customerId;
    const tenantId = req.tenantId;

    return this.prisma.quote.findMany({
      where: { customerId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @UseGuards(CustomerPortalGuard)
  @Get('jobs')
  async getJobs(@Request() req) {
    const customerId = req.customerId;
    const tenantId = req.tenantId;

    return this.prisma.job.findMany({
      where: {
        tenantId,
        appointment: { customerId, tenantId },
      },
      include: {
        appointment: {
          include: {
            service: { select: { name: true } },
          },
        },
        technician: { select: { name: true } },
        photos: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @UseGuards(CustomerPortalGuard)
  @Get('jobs/:id')
  async getJob(@Request() req, @Param('id') id: string) {
    const customerId = req.customerId;
    const tenantId = req.tenantId;

    const job = await this.prisma.job.findFirst({
      where: {
        id,
        tenantId,
        appointment: { customerId, tenantId },
      },
      include: {
        appointment: {
          include: {
            service: true,
            customer: true,
          },
        },
        technician: { select: { id: true, name: true, phone: true } },
        photos: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }
}
