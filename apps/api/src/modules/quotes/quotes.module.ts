import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { PdfService } from './pdf.service';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [PrismaModule, SmsModule],
  controllers: [QuotesController],
  providers: [QuotesService, PdfService],
  exports: [QuotesService, PdfService],
})
export class QuotesModule {}
