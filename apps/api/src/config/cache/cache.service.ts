import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export const CACHE_TTL = {
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  HOUR: 60 * 60 * 1000, // 1 hour
};

export const CACHE_KEYS = {
  TENANT_SETTINGS: (tenantId: string) => `tenant:${tenantId}:settings`,
  SERVICES: (tenantId: string) => `tenant:${tenantId}:services`,
  SERVICE: (tenantId: string, serviceId: string) =>
    `tenant:${tenantId}:service:${serviceId}`,
  AVAILABILITY: (tenantId: string, userId: string) =>
    `tenant:${tenantId}:availability:${userId}`,
  AVAILABILITY_SLOTS: (tenantId: string, date: string) =>
    `tenant:${tenantId}:slots:${date}`,
};

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cache.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    // For Redis, we would use SCAN + DEL
    // For in-memory cache, this is a no-op as cache-manager doesn't support patterns
    // In production with Redis, implement using redis client directly
    const stores = (this.cache as any).stores;
    if (stores && stores[0]?.opts?.store?.keys) {
      const keys = await stores[0].opts.store.keys(pattern);
      if (keys && keys.length > 0) {
        await Promise.all(keys.map((key: string) => this.cache.del(key)));
      }
    }
  }

  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  async invalidateTenantCache(tenantId: string): Promise<void> {
    await this.delByPattern(`tenant:${tenantId}:*`);
  }
}
