import {
  Controller,
  Post,
  Body,
  Request,
  Headers,
  Get,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { DepositPaymentService } from './deposit-payment.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly depositService: DepositPaymentService,
  ) {}

  @Post('create-intent')
  async createPaymentIntent(
    @Body() data: { invoiceId: string },
    @Request() req,
  ) {
    const tenantId = req.user?.tenantId || 'default';
    return this.paymentsService.createPaymentIntent(data.invoiceId, tenantId);
  }

  @Post('create-checkout')
  async createCheckoutSession(
    @Body() data: { invoiceId: string; successUrl: string; cancelUrl: string },
    @Request() req,
  ) {
    const tenantId = req.user?.tenantId || 'default';
    return this.paymentsService.createCheckoutSession(
      data.invoiceId,
      tenantId,
      data.successUrl,
      data.cancelUrl,
    );
  }

  @Public()
  @Post('deposit-checkout')
  async createDepositCheckout(
    @Body() data: {
      tenantId: string;
      appointmentId: string;
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    return this.depositService.createDepositCheckout(
      data.tenantId,
      data.appointmentId,
      data.successUrl,
      data.cancelUrl,
    );
  }

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body not available');
    }
    return this.paymentsService.handleWebhook(rawBody, signature);
  }

  @Get('status')
  async getStatus() {
    return {
      configured: this.paymentsService.isServiceConfigured(),
    };
  }
}
