import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { UserStatus, InvitationStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getTeamMembers(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        status: {
          not: UserStatus.DEACTIVATED,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        joinedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTeamMember(tenantId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        tenantId: true,
        joinedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Team member not found');
    }

    if (user.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return user;
  }

  async updateTeamMember(
    tenantId: string,
    userId: string,
    data: UpdateTeamMemberDto,
  ) {
    await this.getTeamMember(tenantId, userId);

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        joinedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async removeTeamMember(tenantId: string, userId: string) {
    await this.getTeamMember(tenantId, userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.DEACTIVATED },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
    });
  }

  async inviteTeamMember(
    tenantId: string,
    data: InviteTeamMemberDto,
    invitedBy: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      if (existingUser.tenantId === tenantId) {
        throw new ConflictException('User already exists in your team');
      }
      throw new ConflictException('User already exists in another tenant');
    }

    const existingInvitation = await this.prisma.teamInvitation.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: data.email,
        },
      },
    });

    if (
      existingInvitation &&
      existingInvitation.status === InvitationStatus.PENDING
    ) {
      throw new ConflictException('Invitation already sent to this email');
    }

    const token = this.generateSecureToken();
    const expiresAt = this.calculateExpiryDate();

    const invitation = await this.prisma.teamInvitation.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        tenantId,
        token,
        expiresAt,
        invitedBy,
        status: InvitationStatus.PENDING,
      },
    });

    await this.sendInvitationEmail(invitation, tenantId);

    return invitation;
  }

  async getInvitations(tenantId: string) {
    return this.prisma.teamInvitation.findMany({
      where: {
        tenantId,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        expiresAt: true,
        invitedBy: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelInvitation(tenantId: string, invitationId: string) {
    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel invitation with status: ${invitation.status}`,
      );
    }

    return this.prisma.teamInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.CANCELLED },
    });
  }

  async acceptInvitation(token: string, clerkId: string) {
    return this.prisma.withSystemContext(async () => {
      const invitation = await this.prisma.teamInvitation.findUnique({
        where: { token },
        include: { tenant: true },
      });

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException('Invitation is no longer valid');
      }

      if (invitation.expiresAt < new Date()) {
        await this.prisma.teamInvitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });
        throw new BadRequestException('Invitation has expired');
      }

      const user = await this.prisma.user.create({
        data: {
          email: invitation.email,
          name: invitation.name || invitation.email.split('@')[0],
          role: invitation.role,
          status: UserStatus.ACTIVE,
          tenantId: invitation.tenantId,
          clerkId,
          invitedBy: invitation.invitedBy,
          joinedAt: new Date(),
        },
      });

      await this.prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      });

      this.logger.log(
        `User ${user.email} accepted invitation and joined tenant ${invitation.tenantId}`,
      );

      return {
        user,
        tenant: invitation.tenant,
      };
    });
  }

  async resendInvitation(tenantId: string, invitationId: string) {
    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only resend pending invitations');
    }

    const newToken = this.generateSecureToken();
    const newExpiresAt = this.calculateExpiryDate();

    const updatedInvitation = await this.prisma.teamInvitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
    });

    await this.sendInvitationEmail(updatedInvitation, tenantId);

    return updatedInvitation;
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private calculateExpiryDate(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  private async sendInvitationEmail(
    invitation: any,
    tenantId: string,
  ): Promise<void> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        this.logger.warn(`Tenant ${tenantId} not found for sending invitation`);
        return;
      }

      const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${invitation.token}`;

      this.logger.log(
        `Sending invitation email to ${invitation.email} for tenant ${tenant.name}`,
      );
      this.logger.log(`Invitation URL: ${inviteUrl}`);

    } catch (error) {
      this.logger.error(
        `Failed to send invitation email: ${error.message}`,
        error.stack,
      );
    }
  }
}
