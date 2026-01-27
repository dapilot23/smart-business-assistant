import { Injectable, Inject } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Test Redis connectivity by setting and getting a value
      const testKey = '__health_check__';
      await this.cache.set(testKey, 'ok', 5000);
      const result = await this.cache.get(testKey);

      if (result === 'ok') {
        return this.getStatus(key, true, { message: 'Redis is reachable' });
      }

      throw new Error('Redis read/write test failed');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Redis connection failed';
      throw new HealthCheckError(
        'RedisHealthIndicator failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
