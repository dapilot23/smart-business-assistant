import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../../../config/prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true, { message: 'Database is reachable' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Database connection failed';
      throw new HealthCheckError(
        'PrismaHealthIndicator failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
