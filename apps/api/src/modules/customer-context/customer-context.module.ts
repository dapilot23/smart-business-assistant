import { Module } from '@nestjs/common';
import { CustomerContextService } from './customer-context.service';
import { CustomerRiskProfileService } from './customer-risk-profile.service';
import { CacheConfigModule } from '../../config/cache/cache.module';

@Module({
  imports: [CacheConfigModule],
  providers: [CustomerContextService, CustomerRiskProfileService],
  exports: [CustomerContextService, CustomerRiskProfileService],
})
export class CustomerContextModule {}
