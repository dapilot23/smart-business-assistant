import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ActionExecutorService } from '../ai-actions/action-executor.service';
import { AiSuggestionsService } from './ai-suggestions.service';
import {
  AppointmentEventPayload,
  JobEventPayload,
  QuoteEventPayload,
  CustomerEventPayload,
} from '../../config/events/events.types';

@Injectable()
export class ProactiveSuggestionsHandler {
  private readonly logger = new Logger(ProactiveSuggestionsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actionExecutor: ActionExecutorService,
    private readonly suggestionsService: AiSuggestionsService,
  ) {}

  @OnEvent('JOB_COMPLETED')
  async onJobCompleted(payload: JobEventPayload) {
    this.logger.debug(`Job completed: ${payload.jobId}`);

    try {
      const job = await this.prisma.job.findUnique({
        where: { id: payload.jobId },
        include: {
          appointment: {
            include: { customer: true },
          },
        },
      });

      if (!job?.appointment?.customer) return;

      const customer = job.appointment.customer;
      const tenantId = job.tenantId;

      // Check if customer has high NPS - suggest review request
      const recentNps = await this.prisma.npsSurvey.findFirst({
        where: {
          customerId: customer.id,
          respondedAt: { not: null },
        },
        orderBy: { respondedAt: 'desc' },
      });

      if (recentNps?.score && recentNps.score >= 8) {
        // Customer is happy - suggest review request
        await this.actionExecutor.createAction(tenantId, {
          actionType: 'SEND_SMS',
          title: `Request review from ${customer.name}`,
          description: `${customer.name} gave an NPS score of ${recentNps.score}. A great time to request a review!`,
          params: {
            customerId: customer.id,
            phone: customer.phone,
            message: `Hi ${customer.name}! Thank you for choosing us. If you have a moment, we'd love to hear your feedback. Could you leave us a review?`,
            type: 'review_request',
          },
          estimatedImpact: 'Potential positive review',
          riskLevel: 'LOW',
          requiresApproval: true,
        });

        this.logger.log(`Created review request suggestion for ${customer.name}`);
      }

      // Invalidate dashboard suggestions cache
      await this.suggestionsService.invalidateCache(tenantId, 'dashboard');
    } catch (error) {
      this.logger.error(`Error handling JOB_COMPLETED: ${error}`);
    }
  }

  @OnEvent('QUOTE_SENT')
  async onQuoteSent(payload: QuoteEventPayload) {
    this.logger.debug(`Quote sent: ${payload.quoteId}`);

    try {
      const quote = await this.prisma.quote.findUnique({
        where: { id: payload.quoteId },
        include: { customer: true },
      });

      if (!quote?.customer) return;

      // Schedule a follow-up reminder in 3 days
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 3);

      await this.actionExecutor.createAction(quote.tenantId, {
        actionType: 'SCHEDULE_FOLLOW_UP',
        title: `Follow up on quote for ${quote.customer.name}`,
        description: `Quote #${quote.quoteNumber} was sent. Schedule a follow-up if no response by ${followUpDate.toLocaleDateString()}.`,
        params: {
          quoteId: quote.id,
          customerId: quote.customer.id,
          method: 'call',
          scheduledFor: followUpDate.toISOString(),
          suggestedMessage: `Hi ${quote.customer.name}, just checking if you had any questions about the quote I sent. Happy to discuss!`,
        },
        estimatedImpact: 'Improve quote conversion',
        riskLevel: 'LOW',
        requiresApproval: false,
        expiresAt: followUpDate,
      });

      this.logger.log(`Created follow-up suggestion for quote ${quote.quoteNumber}`);

      // Invalidate quotes page suggestions
      await this.suggestionsService.invalidateCache(quote.tenantId, 'quotes_page');
    } catch (error) {
      this.logger.error(`Error handling QUOTE_SENT: ${error}`);
    }
  }

  @OnEvent('CUSTOMER_CREATED')
  async onCustomerCreated(payload: CustomerEventPayload) {
    this.logger.debug(`Customer created: ${payload.customerId}`);

    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: payload.customerId },
      });

      if (!customer) return;

      // Suggest welcome message for new customers
      if (customer.phone) {
        await this.actionExecutor.createAction(customer.tenantId, {
          actionType: 'SEND_SMS',
          title: `Welcome ${customer.name}`,
          description: 'Send a welcome message to your new customer',
          params: {
            customerId: customer.id,
            phone: customer.phone,
            message: `Hi ${customer.name}! Welcome to our family. We're excited to serve you. Reply to this message if you have any questions!`,
            type: 'welcome',
          },
          estimatedImpact: 'Build customer relationship',
          riskLevel: 'LOW',
          requiresApproval: true,
        });

        this.logger.log(`Created welcome message suggestion for ${customer.name}`);
      }

      // Invalidate customers list suggestions
      await this.suggestionsService.invalidateCache(customer.tenantId, 'customers_list');
    } catch (error) {
      this.logger.error(`Error handling CUSTOMER_CREATED: ${error}`);
    }
  }

  @OnEvent('INVOICE_OVERDUE')
  async onInvoiceOverdue(payload: { invoiceId: string; tenantId: string }) {
    this.logger.debug(`Invoice overdue: ${payload.invoiceId}`);

    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: payload.invoiceId },
        include: { customer: true },
      });

      if (!invoice?.customer) return;

      const daysOverdue = Math.floor(
        (Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      await this.actionExecutor.createAction(invoice.tenantId, {
        actionType: 'SEND_SMS',
        title: `Payment reminder for ${invoice.customer.name}`,
        description: `Invoice #${invoice.invoiceNumber} is ${daysOverdue} days overdue. Send a friendly payment reminder.`,
        params: {
          customerId: invoice.customer.id,
          phone: invoice.customer.phone,
          message: `Hi ${invoice.customer.name}, this is a friendly reminder about invoice #${invoice.invoiceNumber}. Please let us know if you have any questions about your balance.`,
          type: 'payment_reminder',
          invoiceId: invoice.id,
        },
        estimatedImpact: 'Improve cash flow',
        riskLevel: 'LOW',
        requiresApproval: true,
      });

      this.logger.log(`Created payment reminder suggestion for invoice ${invoice.invoiceNumber}`);

      // Invalidate dashboard suggestions
      await this.suggestionsService.invalidateCache(invoice.tenantId, 'dashboard');
    } catch (error) {
      this.logger.error(`Error handling INVOICE_OVERDUE: ${error}`);
    }
  }

  @OnEvent('APPOINTMENT_CANCELLED')
  async onAppointmentCancelled(payload: AppointmentEventPayload) {
    this.logger.debug(`Appointment cancelled: ${payload.appointmentId}`);

    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: payload.appointmentId },
        include: { customer: true },
      });

      if (!appointment?.customer) return;

      // Check if there are customers on the waitlist for this time slot
      const waitlistCount = await this.prisma.waitlist.count({
        where: {
          tenantId: appointment.tenantId,
          status: 'WAITING',
          preferredDate: appointment.scheduledAt,
        },
      });

      if (waitlistCount > 0) {
        await this.actionExecutor.createAction(appointment.tenantId, {
          actionType: 'SEND_SMS',
          title: 'Offer cancelled slot to waitlist',
          description: `${waitlistCount} customer(s) on waitlist for the cancelled time slot. Offer them the opening.`,
          params: {
            type: 'waitlist_offer',
            cancelledAppointmentId: appointment.id,
            timeSlot: appointment.scheduledAt,
          },
          estimatedImpact: `Fill slot from ${waitlistCount} waitlisted customers`,
          riskLevel: 'LOW',
          requiresApproval: true,
        });

        this.logger.log(`Created waitlist notification suggestion for cancelled slot`);
      }

      // Invalidate dashboard suggestions
      await this.suggestionsService.invalidateCache(appointment.tenantId, 'dashboard');
    } catch (error) {
      this.logger.error(`Error handling APPOINTMENT_CANCELLED: ${error}`);
    }
  }
}
