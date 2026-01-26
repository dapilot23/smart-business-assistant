import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { CustomerPortalAuthService } from './customer-portal-auth.service';

@Injectable()
export class CustomerPortalGuard implements CanActivate {
  constructor(private readonly authService: CustomerPortalAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get token from header or cookie
    const token =
      this.extractTokenFromHeader(request) ||
      this.extractTokenFromCookie(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    const session = await this.authService.validateSession(token);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Attach customer info to request
    request.customer = session.customer;
    request.customerId = session.customerId;
    request.tenantId = session.tenantId;
    request.sessionToken = token;

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer') return undefined;

    return token;
  }

  private extractTokenFromCookie(request: any): string | undefined {
    return request.cookies?.customer_session;
  }
}
