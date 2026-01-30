import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { toNum } from '../../common/utils/decimal';

@Injectable()
export class DepositPaymentService {
  private readonly logger = new Logger(DepositPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async createDepositCheckout(
    tenantId: string,
    appointmentId: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    return this.prisma.withTenantContext(tenantId, async () => {
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
      });

      if (!settings?.depositRequired) {
        throw new BadRequestException('Deposits are not enabled for this tenant');
      }

      const appointment = await this.prisma.appointment.findFirst({
        where: { id: appointmentId, tenantId },
        include: { service: true, customer: true },
      });

      if (!appointment) {
        throw new BadRequestException('Appointment not found');
      }

      if (!appointment.service) {
        throw new BadRequestException('Appointment has no associated service');
      }

      const servicePrice = toNum(appointment.service.price);
      const depositPercentage = settings.depositPercentage || 50;
      const depositAmount = Math.round(servicePrice * depositPercentage) / 100;

      if (depositAmount <= 0) {
        throw new BadRequestException('Deposit amount must be greater than zero');
      }

      const session = await this.paymentsService.createCustomCheckout({
        amount: depositAmount,
        description: `Deposit for ${appointment.service.name}`,
        metadata: {
          type: 'deposit',
          appointmentId: appointment.id,
          tenantId,
          customerId: appointment.customerId,
        },
        successUrl,
        cancelUrl,
        customerEmail: appointment.customer?.email || undefined,
      });

      this.logger.log(
        `Deposit checkout created: $${depositAmount} for appointment ${appointmentId}`,
      );

      return {
        ...session,
        depositAmount,
        depositPercentage,
      };
    });
  }
}
