import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap, tap, finalize } from 'rxjs/operators';
import { PrismaService } from '../../config/prisma/prisma.service';
import { RequestWithTenant } from '../middleware/tenant-context.middleware';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const tenantId = request.user?.tenantId || request.tenantId;

    if (!tenantId) {
      return next.handle();
    }

    return from(this.prisma.setTenantContext(tenantId)).pipe(
      switchMap(() => next.handle()),
      finalize(() => this.prisma.clearTenantContext())
    );
  }
}
