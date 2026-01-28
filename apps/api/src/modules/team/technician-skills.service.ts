import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { SkillLevel, UserRole } from '@prisma/client';

export interface SkillInput {
  serviceId: string;
  level: SkillLevel;
}

export interface QualifiedTechnician {
  userId: string;
  userName: string;
  level: SkillLevel;
}

@Injectable()
export class TechnicianSkillsService {
  private readonly logger = new Logger(TechnicianSkillsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async setSkills(
    userId: string,
    tenantId: string,
    skills: SkillInput[],
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true, role: true },
    });

    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.TECHNICIAN) {
      throw new BadRequestException('Skills can only be assigned to technicians');
    }

    await this.prisma.technicianSkill.deleteMany({
      where: { userId, tenantId },
    });

    if (skills.length > 0) {
      await this.prisma.technicianSkill.createMany({
        data: skills.map((skill) => ({
          userId,
          tenantId,
          serviceId: skill.serviceId,
          level: skill.level,
        })),
      });
    }

    this.logger.log(`Set ${skills.length} skills for technician ${userId}`);
  }

  async getSkillsForUser(userId: string, tenantId: string) {
    return this.prisma.technicianSkill.findMany({
      where: { userId, tenantId },
      include: { service: { select: { id: true, name: true } } },
      orderBy: { level: 'desc' },
    });
  }

  async getTechniciansForService(serviceId: string, tenantId: string) {
    const skills = await this.prisma.technicianSkill.findMany({
      where: { serviceId, tenantId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { level: 'desc' },
    });

    return skills.map((skill) => ({
      userId: skill.user.id,
      userName: skill.user.name,
      level: skill.level,
    }));
  }

  async removeSkill(
    userId: string,
    serviceId: string,
    tenantId: string,
  ): Promise<void> {
    await this.prisma.technicianSkill.deleteMany({
      where: { userId, serviceId, tenantId },
    });

    this.logger.log(`Removed skill for service ${serviceId} from user ${userId}`);
  }

  async hasSkillForService(
    userId: string,
    serviceId: string,
    tenantId: string,
  ): Promise<boolean> {
    const skill = await this.prisma.technicianSkill.findFirst({
      where: { userId, serviceId, tenantId },
    });
    return skill !== null;
  }

  async getSkillLevel(
    userId: string,
    serviceId: string,
    tenantId: string,
  ): Promise<SkillLevel | null> {
    const skill = await this.prisma.technicianSkill.findFirst({
      where: { userId, serviceId, tenantId },
    });
    return skill?.level ?? null;
  }
}
