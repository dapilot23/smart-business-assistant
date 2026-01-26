import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TenantThrottlerGuard } from './tenant-throttler.guard';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000, // 1 second
            limit: 10, // 10 requests per second
          },
          {
            name: 'medium',
            ttl: 10000, // 10 seconds
            limit: 50, // 50 requests per 10 seconds
          },
          {
            name: 'long',
            ttl: 60000, // 1 minute
            limit: 200, // 200 requests per minute
          },
        ],
        errorMessage: 'Too many requests. Please try again later.',
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: TenantThrottlerGuard,
    },
  ],
  exports: [ThrottlerModule],
})
export class ThrottleModule {}
