import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CircuitBreakerService } from '../../common/circuit-breaker/circuit-breaker.service';
import { EventsService } from '../../config/events/events.service';
import { EVENTS, PaymentEventPayload } from '../../config/events/events.types';
import { toNum } from '../../common/utils/decimal';
import Stripe from 'stripe';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;
  private readonly isConfigured: boolean;
  private readonly webhookSecret: string;
  private stripePaymentIntentBreaker: any | null = null;
  private stripeCheckoutBreaker: any | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly eventsService: EventsService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    this.isConfigured = !!secretKey && secretKey.length > 0;

    if (this.isConfigured && secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2025-12-15.clover' });
      this.logger.log('Stripe payment service initialized');
    } else {
      this.logger.warn('Stripe not configured - STRIPE_SECRET_KEY missing');
    }
  }

  onModuleInit() {
    if (this.isConfigured && this.stripe) {
      this.stripePaymentIntentBreaker = this.circuitBreakerService.createBreaker(
        'stripe-payment-intent',
        this.createPaymentIntentInternal.bind(this),
        {
          timeout: 15000,
          errorThresholdPercentage: 50,
          resetTimeout: 60000,
        },
      );

      this.stripeCheckoutBreaker = this.circuitBreakerService.createBreaker(
        'stripe-checkout-session',
        this.createCheckoutSessionInternal.bind(this),
        {
          timeout: 15000,
          errorThresholdPercentage: 50,
          resetTimeout: 60000,
        },
      );
    }
  }

  private ensureConfigured(): void {
    if (!this.isConfigured || !this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
  }

  private async createPaymentIntentInternal(params: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    description: string;
    receipt_email?: string;
  }): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Stripe client not initialized');
    }
    return this.stripe.paymentIntents.create(params);
  }

  private async createCheckoutSessionInternal(
    params: Stripe.Checkout.SessionCreateParams,
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error('Stripe client not initialized');
    }
    return this.stripe.checkout.sessions.create(params);
  }

  async createPaymentIntent(invoiceId: string, tenantId: string) {
    this.ensureConfigured();

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { customer: true },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    // Calculate remaining amount
    const amountDue = Math.round((toNum(invoice.amount) - toNum(invoice.paidAmount)) * 100);

    if (amountDue <= 0) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    // Create Stripe payment intent
    const paymentIntentParams = {
      amount: amountDue,
      currency: 'usd',
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        tenantId,
        customerId: invoice.customerId,
      },
      description: `Payment for Invoice ${invoice.invoiceNumber}`,
      receipt_email: invoice.customer.email || undefined,
    };

    let paymentIntent: Stripe.PaymentIntent;
    try {
      if (this.stripePaymentIntentBreaker) {
        paymentIntent = await this.stripePaymentIntentBreaker.fire(paymentIntentParams);
      } else {
        paymentIntent = await this.createPaymentIntentInternal(paymentIntentParams);
      }
    } catch (error) {
      this.logger.error(`Failed to create payment intent for invoice ${invoiceId}:`, error);
      if (error.message?.includes('Breaker is open')) {
        throw new BadRequestException(
          'Payment service temporarily unavailable. Please try again later.',
        );
      }
      throw new BadRequestException(
        `Failed to create payment intent: ${error.message || 'Unknown error'}`,
      );
    }

    // Update invoice with payment intent ID
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    this.logger.log(`Payment intent created: ${paymentIntent.id} for invoice ${invoiceId}`);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountDue / 100,
    };
  }

  async createCheckoutSession(invoiceId: string, tenantId: string, successUrl: string, cancelUrl: string) {
    this.ensureConfigured();

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { customer: true },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    const amountDue = Math.round((toNum(invoice.amount) - toNum(invoice.paidAmount)) * 100);

    if (amountDue <= 0) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: invoice.description,
            },
            unit_amount: amountDue,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      customer_email: invoice.customer.email || undefined,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        tenantId,
      },
    };

    let session: Stripe.Checkout.Session;
    try {
      if (this.stripeCheckoutBreaker) {
        session = await this.stripeCheckoutBreaker.fire(sessionParams);
      } else {
        session = await this.createCheckoutSessionInternal(sessionParams);
      }
    } catch (error) {
      this.logger.error(`Failed to create checkout session for invoice ${invoiceId}:`, error);
      if (error.message?.includes('Breaker is open')) {
        throw new BadRequestException(
          'Payment service temporarily unavailable. Please try again later.',
        );
      }
      throw new BadRequestException(
        `Failed to create checkout session: ${error.message || 'Unknown error'}`,
      );
    }

    this.logger.log(`Checkout session created: ${session.id}`);

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async createCustomCheckout(params: {
    amount: number;
    description: string;
    metadata: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }) {
    this.ensureConfigured();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: params.description },
          unit_amount: Math.round(params.amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.cancelUrl,
      customer_email: params.customerEmail,
      metadata: params.metadata,
    };

    try {
      const session = this.stripeCheckoutBreaker
        ? await this.stripeCheckoutBreaker.fire(sessionParams)
        : await this.createCheckoutSessionInternal(sessionParams);

      return { sessionId: session.id, url: session.url };
    } catch (error) {
      this.logger.error('Failed to create custom checkout:', error);
      throw new BadRequestException(
        error.message?.includes('Breaker is open')
          ? 'Payment service temporarily unavailable.'
          : `Failed to create checkout: ${error.message}`,
      );
    }
  }

  async handleWebhook(payload: Buffer, signature: string) {
    this.ensureConfigured();

    let event: Stripe.Event;

    try {
      event = this.stripe!.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (err) {
      this.logger.error('Webhook signature verification failed:', err.message);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;

      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const invoiceId = paymentIntent.metadata?.invoiceId;
    if (!invoiceId) {
      this.logger.warn('Payment intent missing invoice ID in metadata');
      return;
    }

    const paidAmount = paymentIntent.amount_received / 100;

    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: { increment: paidAmount },
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
      include: { customer: true },
    });

    this.eventsService.emit<PaymentEventPayload>(EVENTS.PAYMENT_RECEIVED, {
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      customerId: invoice.customer.id,
      customerName: invoice.customer.name,
      customerPhone: invoice.customer.phone || undefined,
      customerEmail: invoice.customer.email || undefined,
      amount: paidAmount,
      currency: 'usd',
    });

    this.logger.log(`Invoice ${invoiceId} marked as paid: $${paidAmount}`);
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    const invoiceId = paymentIntent.metadata?.invoiceId;
    if (!invoiceId) return;

    this.logger.error(`Payment failed for invoice ${invoiceId}`);
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) {
      this.logger.warn('Checkout session missing invoice ID in metadata');
      return;
    }

    if (session.payment_status === 'paid') {
      const paidAmount = (session.amount_total || 0) / 100;

      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: { increment: paidAmount },
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
        },
      });

      this.logger.log(`Invoice ${invoiceId} paid via checkout: $${paidAmount}`);
    }
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}
