import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

export const SKIP_THROTTLE_KEY = 'skipThrottle';

@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: any,
    storageService: any,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const skipThrottle = this.reflector.getAllAndOverride<boolean>(
      SKIP_THROTTLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Skip throttling for health endpoints
    const request = context.switchToHttp().getRequest();
    if (request.url?.startsWith('/health')) {
      return true;
    }

    if (skipThrottle) {
      return true;
    }

    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use tenant ID if available, otherwise fall back to IP
    const tenantId = req.user?.tenantId || req.tenantId;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    if (tenantId) {
      return `tenant:${tenantId}:${ip}`;
    }

    return ip;
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}
