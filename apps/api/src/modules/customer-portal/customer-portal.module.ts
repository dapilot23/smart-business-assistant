import { Module } from '@nestjs/common';
import { CustomerPortalController } from './customer-portal.controller';
import { CustomerPortalAuthService } from './customer-portal-auth.service';
import { CustomerPortalGuard } from './customer-portal.guard';
import { SmsModule } from '../sms/sms.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [SmsModule, EmailModule],
  controllers: [CustomerPortalController],
  providers: [CustomerPortalAuthService, CustomerPortalGuard],
  exports: [CustomerPortalAuthService, CustomerPortalGuard],
})
export class CustomerPortalModule {}
