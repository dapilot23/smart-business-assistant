import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceOverdueService } from './invoice-overdue.service';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { SmsModule } from '../sms/sms.module';
import { PaymentReminderModule } from '../payment-reminders/payment-reminder.module';
import { EventsModule } from '../../config/events/events.module';

@Module({
  imports: [PrismaModule, SmsModule, PaymentReminderModule, EventsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfService, InvoiceOverdueService],
  exports: [InvoicesService, InvoicePdfService],
})
export class InvoicesModule {}
