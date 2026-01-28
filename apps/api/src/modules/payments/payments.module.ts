import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { DepositPaymentService } from './deposit-payment.service';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, DepositPaymentService],
  exports: [PaymentsService, DepositPaymentService],
})
export class PaymentsModule {}
