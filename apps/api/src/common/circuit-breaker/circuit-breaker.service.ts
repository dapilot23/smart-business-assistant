import { Injectable, Logger } from '@nestjs/common';
import * as opossum from 'opossum';

// Handle both ESM and CommonJS module systems
const CircuitBreaker = (opossum as any).default || opossum;

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50, // Open circuit after 50% failures
  resetTimeout: 30000, // Try again after 30 seconds
  volumeThreshold: 5, // Minimum calls before circuit can open
};

type CircuitBreakerInstance = InstanceType<typeof CircuitBreaker>;

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreakerInstance>();

  createBreaker<T>(
    name: string,
    action: (...args: unknown[]) => Promise<T>,
    options: CircuitBreakerOptions = {},
  ): CircuitBreakerInstance {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    const breaker = new CircuitBreaker(action, mergedOptions);

    breaker.on('open', () => {
      this.logger.warn(`Circuit breaker '${name}' opened`);
    });

    breaker.on('halfOpen', () => {
      this.logger.log(`Circuit breaker '${name}' half-open, testing...`);
    });

    breaker.on('close', () => {
      this.logger.log(`Circuit breaker '${name}' closed`);
    });

    breaker.on('fallback', () => {
      this.logger.debug(`Circuit breaker '${name}' fallback triggered`);
    });

    this.breakers.set(name, breaker);
    return breaker;
  }

  getBreaker(name: string): CircuitBreakerInstance | undefined {
    return this.breakers.get(name);
  }

  getStats(name: string) {
    const breaker = this.breakers.get(name);
    if (!breaker) return null;
    return breaker.stats;
  }

  getAllStats() {
    const stats: Record<string, unknown> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = {
        state: breaker.status.stats,
        isOpen: breaker.opened,
        isHalfOpen: breaker.halfOpen,
      };
    }
    return stats;
  }
}
