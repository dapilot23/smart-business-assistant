import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class ThrottlerStorageRedisService
  implements ThrottlerStorage, OnModuleInit, OnModuleDestroy
{
  private redis: Redis | null = null;
  private readonly redisUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
  }

  onModuleInit() {
    this.redis = new Redis(this.redisUrl, {
      keyPrefix: 'throttle:',
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });
  }

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (!this.redis) {
      throw new Error('Redis not initialized');
    }

    const redisKey = `${throttlerName}:${key}`;
    const blockedKey = `${redisKey}:blocked`;

    // Check if blocked
    const isBlocked = await this.checkBlocked(blockedKey);
    if (isBlocked.blocked) {
      return this.buildBlockedResponse(limit, isBlocked.ttl);
    }

    // Increment counter and check limit
    const hitData = await this.incrementCounter(redisKey, ttl);

    // Handle blocking if over limit
    if (hitData.totalHits > limit && blockDuration > 0) {
      await this.setBlocked(blockedKey, blockDuration);
      return this.buildBlockedResponse(
        hitData.totalHits,
        hitData.timeToExpire,
        blockDuration,
      );
    }

    return {
      totalHits: hitData.totalHits,
      timeToExpire: hitData.timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  private async checkBlocked(
    blockedKey: string,
  ): Promise<{ blocked: boolean; ttl: number }> {
    const blockedTtl = await this.redis!.ttl(blockedKey);
    return {
      blocked: blockedTtl > 0,
      ttl: blockedTtl * 1000,
    };
  }

  private async incrementCounter(
    redisKey: string,
    ttl: number,
  ): Promise<{ totalHits: number; timeToExpire: number }> {
    const totalHits = await this.redis!.incr(redisKey);

    if (totalHits === 1) {
      await this.redis!.pexpire(redisKey, ttl);
    }

    const timeToExpire = await this.redis!.pttl(redisKey);

    return {
      totalHits,
      timeToExpire: Math.max(timeToExpire, 0),
    };
  }

  private async setBlocked(blockedKey: string, blockDuration: number) {
    await this.redis!.set(blockedKey, '1', 'PX', blockDuration);
  }

  private buildBlockedResponse(
    totalHits: number,
    timeToExpire: number,
    blockDuration?: number,
  ): ThrottlerStorageRecord {
    return {
      totalHits: typeof totalHits === 'number' ? totalHits : totalHits + 1,
      timeToExpire: Math.max(timeToExpire, 0),
      isBlocked: true,
      timeToBlockExpire: blockDuration || timeToExpire,
    };
  }
}
