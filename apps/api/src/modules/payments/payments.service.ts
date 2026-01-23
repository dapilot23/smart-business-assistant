import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma/prisma.service';
import Stripe from 'stripe';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;
  private readonly isConfigured: boolean;
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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

  private ensureConfigured(): void {
    if (!this.isConfigured || !this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
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
    const amountDue = Math.round((invoice.amount - invoice.paidAmount) * 100);

    if (amountDue <= 0) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    // Create Stripe payment intent
    const paymentIntent = await this.stripe!.paymentIntents.create({
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
    });

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

    const amountDue = Math.round((invoice.amount - invoice.paidAmount) * 100);

    if (amountDue <= 0) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const session = await this.stripe!.checkout.sessions.create({
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
    });

    this.logger.log(`Checkout session created: ${session.id}`);

    return {
      sessionId: session.id,
      url: session.url,
    };
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

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: { increment: paidAmount },
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
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
