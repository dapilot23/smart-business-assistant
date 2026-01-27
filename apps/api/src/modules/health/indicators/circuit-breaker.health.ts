import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { CircuitBreakerService } from '../../../common/circuit-breaker/circuit-breaker.service';

@Injectable()
export class CircuitBreakerHealthIndicator extends HealthIndicator {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const stats = this.circuitBreakerService.getAllStats();
    const breakerNames = Object.keys(stats);

    const openBreakers = breakerNames.filter(
      (name) => (stats[name] as any)?.isOpen === true,
    );

    const details: Record<string, string> = {};
    for (const name of breakerNames) {
      const breaker = stats[name] as any;
      if (breaker.isOpen) {
        details[name] = 'OPEN';
      } else if (breaker.isHalfOpen) {
        details[name] = 'HALF_OPEN';
      } else {
        details[name] = 'CLOSED';
      }
    }

    if (openBreakers.length > 0) {
      throw new HealthCheckError(
        'CircuitBreakerHealthIndicator degraded',
        this.getStatus(key, false, {
          message: `${openBreakers.length} circuit breaker(s) open: ${openBreakers.join(', ')}`,
          breakers: details,
        }),
      );
    }

    return this.getStatus(key, true, {
      message:
        breakerNames.length > 0
          ? `All ${breakerNames.length} circuit breakers closed`
          : 'No circuit breakers registered',
      breakers: details,
    });
  }
}
