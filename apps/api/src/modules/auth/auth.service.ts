import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { UserRole } from '@prisma/client';

interface ClerkUserData {
  clerkId: string;
  email: string;
  name: string;
  publicMetadata: Record<string, unknown>;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async syncClerkUser(clerkData: ClerkUserData) {
    let user = await this.prisma.user.findUnique({
      where: { clerkId: clerkData.clerkId },
      include: { tenant: true },
    });

    if (user) {
      return user;
    }

    let tenantId = clerkData.publicMetadata?.tenantId as string;

    // If no tenantId in metadata, try to find or use demo tenant for easy testing
    if (!tenantId) {
      const demoTenant = await this.prisma.tenant.findUnique({
        where: { slug: 'demo-plumbing' },
      });

      if (demoTenant) {
        tenantId = demoTenant.id;
      } else {
        throw new BadRequestException(
          'User must be assigned to a tenant. Set tenantId in Clerk user metadata.',
        );
      }
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    user = await this.prisma.user.create({
      data: {
        clerkId: clerkData.clerkId,
        email: clerkData.email,
        name: clerkData.name,
        tenantId,
        role: (clerkData.publicMetadata?.role as UserRole) || UserRole.ADMIN,
      },
      include: { tenant: true },
    });

    return user;
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async findByClerkId(clerkId: string) {
    return this.prisma.user.findUnique({
      where: { clerkId },
      include: { tenant: true },
    });
  }
}
