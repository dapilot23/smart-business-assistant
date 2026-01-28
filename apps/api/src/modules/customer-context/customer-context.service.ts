import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../config/cache/cache.service';
import { toNum } from '../../common/utils/decimal';

export interface CustomerVoiceContext {
  customerId: string;
  name: string;
  phone: string;
  isReturningCustomer: boolean;
  totalVisits: number;
  totalSpent: number;
  lastServiceType?: string;
  preferredTime?: string;
  lastInteraction?: Date;
  aiSummary?: string;
  upcomingAppointment?: {
    date: Date;
    serviceName: string;
  };
  pendingInvoice?: {
    amount: number;
    dueDate: Date;
  };
}

@Injectable()
export class CustomerContextService {
  private readonly logger = new Logger(CustomerContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get or create context for a customer by phone number
   */
  async getContextByPhone(
    tenantId: string,
    phone: string,
  ): Promise<CustomerVoiceContext | null> {
    const cacheKey = `customer_context:${tenantId}:${phone}`;

    return this.cache.wrap(
      cacheKey,
      () => this.buildContextByPhone(tenantId, phone),
      CACHE_TTL.SHORT,
    );
  }

  private async buildContextByPhone(
    tenantId: string,
    phone: string,
  ): Promise<CustomerVoiceContext | null> {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, phone },
      include: {
        context: true,
        appointments: {
          where: {
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
            scheduledAt: { gte: new Date() },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
          include: { service: true },
        },
        invoices: {
          where: {
            status: { in: ['SENT', 'OVERDUE'] },
          },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
    });

    if (!customer) {
      return null;
    }

    const context = customer.context;
    const upcomingAppt = customer.appointments[0];
    const pendingInvoice = customer.invoices[0];

    return {
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone,
      isReturningCustomer: (context?.totalVisits ?? 0) > 0,
      totalVisits: context?.totalVisits ?? 0,
      totalSpent: toNum(context?.totalSpent),
      lastServiceType: context?.lastServiceType ?? undefined,
      preferredTime: context?.preferredTime ?? undefined,
      lastInteraction: context?.lastInteraction ?? undefined,
      aiSummary: context?.aiSummary ?? undefined,
      upcomingAppointment: upcomingAppt
        ? {
            date: upcomingAppt.scheduledAt,
            serviceName: upcomingAppt.service?.name ?? 'Service',
          }
        : undefined,
      pendingInvoice: pendingInvoice
        ? {
            amount: toNum(pendingInvoice.amount) - toNum(pendingInvoice.paidAmount),
            dueDate: pendingInvoice.dueDate,
          }
        : undefined,
    };
  }

  /**
   * Update customer context after a service interaction
   */
  async updateAfterService(
    customerId: string,
    serviceType: string,
    amount: number,
  ): Promise<void> {
    await this.prisma.customerContext.upsert({
      where: { customerId },
      create: {
        customerId,
        tenantId: '', // Will be set from customer lookup
        lastServiceType: serviceType,
        totalVisits: 1,
        totalSpent: amount,
        lastInteraction: new Date(),
      },
      update: {
        lastServiceType: serviceType,
        totalVisits: { increment: 1 },
        totalSpent: { increment: amount },
        lastInteraction: new Date(),
      },
    });

    // Invalidate cache
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (customer) {
      await this.cache.del(`customer_context:${customer.tenantId}:${customer.phone}`);
    }
  }

  /**
   * Update customer context with AI-generated summary
   */
  async updateAiSummary(customerId: string, summary: string): Promise<void> {
    await this.prisma.customerContext.upsert({
      where: { customerId },
      create: {
        customerId,
        tenantId: '',
        aiSummary: summary,
      },
      update: {
        aiSummary: summary,
      },
    });
  }

  /**
   * Record a customer interaction (call, SMS, etc.)
   */
  async recordInteraction(customerId: string): Promise<void> {
    await this.prisma.customerContext.upsert({
      where: { customerId },
      create: {
        customerId,
        tenantId: '',
        lastInteraction: new Date(),
      },
      update: {
        lastInteraction: new Date(),
      },
    });
  }

  /**
   * Build a personalized greeting for voice AI
   */
  buildGreeting(context: CustomerVoiceContext | null, businessName: string): string {
    if (!context) {
      return `Thank you for calling ${businessName}. How can I help you today?`;
    }

    if (context.isReturningCustomer) {
      const timeGreeting = this.getTimeOfDayGreeting();
      let greeting = `${timeGreeting}, ${context.name}! Welcome back to ${businessName}.`;

      if (context.upcomingAppointment) {
        const apptDate = this.formatDate(context.upcomingAppointment.date);
        greeting += ` I see you have a ${context.upcomingAppointment.serviceName} scheduled for ${apptDate}.`;
      }

      greeting += ' How can I help you today?';
      return greeting;
    }

    return `Thank you for calling ${businessName}. How can I help you today?`;
  }

  private getTimeOfDayGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
