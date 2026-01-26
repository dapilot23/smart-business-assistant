import { Module } from '@nestjs/common';
import { CustomerContextService } from './customer-context.service';
import { CacheConfigModule } from '../../config/cache/cache.module';

@Module({
  imports: [CacheConfigModule],
  providers: [CustomerContextService],
  exports: [CustomerContextService],
})
export class CustomerContextModule {}
