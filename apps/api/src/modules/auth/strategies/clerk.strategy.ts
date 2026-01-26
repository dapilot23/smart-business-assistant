import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { ClerkService } from '../../../config/clerk/clerk.service';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../config/prisma/prisma.service';

@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, 'clerk') {
  constructor(
    private readonly clerkService: ClerkService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async validate(req: Request): Promise<any> {
    // Demo mode - ONLY allowed in development environment
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const demoMode = this.configService.get('DEMO_MODE') === 'true';
    const authHeader = req.headers.authorization;

    // SECURITY: Demo mode is completely disabled in production
    if (demoMode && !isProduction && (!authHeader || !authHeader.startsWith('Bearer '))) {
      // Return demo user only in non-production environments
      const demoUser = await this.prisma.user.findFirst({
        where: {
          tenant: { slug: 'demo-plumbing' },
          role: 'ADMIN',
        },
        include: { tenant: true },
      });

      if (demoUser) {
        return {
          userId: demoUser.id,
          clerkId: demoUser.clerkId || 'demo',
          tenantId: demoUser.tenantId,
          email: demoUser.email,
          role: demoUser.role,
        };
      }
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7);
    const secretKey = this.clerkService.getSecretKey();

    try {
      const payload = await verifyToken(token, { secretKey });

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token');
      }

      const clerkClient = this.clerkService.getClient();
      const clerkUser = await clerkClient.users.getUser(payload.sub);

      const emailAddress = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

      if (!emailAddress) {
        throw new UnauthorizedException('User email not found');
      }

      const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
        || emailAddress.split('@')[0];

      const user = await this.authService.syncClerkUser({
        clerkId: clerkUser.id,
        email: emailAddress,
        name: fullName,
        publicMetadata: clerkUser.publicMetadata,
      });

      return {
        userId: user.id,
        clerkId: user.clerkId,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
