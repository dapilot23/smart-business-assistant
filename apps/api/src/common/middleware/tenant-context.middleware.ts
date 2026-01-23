import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface RequestWithTenant extends Request {
  tenantId?: string;
  user?: {
    userId: string;
    clerkId?: string;
    tenantId: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: RequestWithTenant, res: Response, next: NextFunction) {
    if (req.user?.tenantId) {
      req.tenantId = req.user.tenantId;
    }

    next();
  }
}
