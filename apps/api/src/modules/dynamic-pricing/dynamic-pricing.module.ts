import { Module } from '@nestjs/common';
import { DynamicPricingController } from './dynamic-pricing.controller';
import { DynamicPricingService } from './dynamic-pricing.service';
import { PricingRulesService } from './pricing-rules.service';

@Module({
  controllers: [DynamicPricingController],
  providers: [DynamicPricingService, PricingRulesService],
  exports: [DynamicPricingService, PricingRulesService],
})
export class DynamicPricingModule {}
