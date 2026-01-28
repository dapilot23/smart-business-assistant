import { Test, TestingModule } from '@nestjs/testing';
import { TechnicianSkillsService } from './technician-skills.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock';
import { SkillLevel, UserRole } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TechnicianSkillsService', () => {
  let service: TechnicianSkillsService;
  let prisma: MockPrismaService;

  const tenantId = 'tenant-1';
  const userId = 'user-1';
  const serviceId = 'service-1';

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicianSkillsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TechnicianSkillsService>(TechnicianSkillsService);
  });

  describe('setSkills', () => {
    it('should create skills for a technician', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        tenantId,
        role: UserRole.TECHNICIAN,
      });
      prisma.technicianSkill.deleteMany.mockResolvedValue({ count: 0 });
      prisma.technicianSkill.createMany.mockResolvedValue({ count: 2 });

      const skills = [
        { serviceId: 'service-1', level: SkillLevel.EXPERT },
        { serviceId: 'service-2', level: SkillLevel.BASIC },
      ];

      await service.setSkills(userId, tenantId, skills);

      expect(prisma.technicianSkill.deleteMany).toHaveBeenCalledWith({
        where: { userId, tenantId },
      });
      expect(prisma.technicianSkill.createMany).toHaveBeenCalledWith({
        data: [
          { userId, tenantId, serviceId: 'service-1', level: SkillLevel.EXPERT },
          { userId, tenantId, serviceId: 'service-2', level: SkillLevel.BASIC },
        ],
      });
    });

    it('should replace existing skills', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        tenantId,
        role: UserRole.TECHNICIAN,
      });
      prisma.technicianSkill.deleteMany.mockResolvedValue({ count: 3 });
      prisma.technicianSkill.createMany.mockResolvedValue({ count: 1 });

      const skills = [{ serviceId: 'service-1', level: SkillLevel.INTERMEDIATE }];

      await service.setSkills(userId, tenantId, skills);

      expect(prisma.technicianSkill.deleteMany).toHaveBeenCalledWith({
        where: { userId, tenantId },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.setSkills(userId, tenantId, [{ serviceId, level: SkillLevel.BASIC }]),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not a technician', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        tenantId,
        role: UserRole.OWNER,
      });

      await expect(
        service.setSkills(userId, tenantId, [{ serviceId, level: SkillLevel.BASIC }]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSkillsForUser', () => {
    it('should return all skills for a technician', async () => {
      const mockSkills = [
        { id: 'skill-1', userId, serviceId: 'service-1', level: SkillLevel.EXPERT, service: { name: 'HVAC Repair' } },
        { id: 'skill-2', userId, serviceId: 'service-2', level: SkillLevel.BASIC, service: { name: 'Plumbing' } },
      ];
      prisma.technicianSkill.findMany.mockResolvedValue(mockSkills);

      const result = await service.getSkillsForUser(userId, tenantId);

      expect(result).toEqual(mockSkills);
      expect(prisma.technicianSkill.findMany).toHaveBeenCalledWith({
        where: { userId, tenantId },
        include: { service: { select: { id: true, name: true } } },
        orderBy: { level: 'desc' },
      });
    });
  });

  describe('getTechniciansForService', () => {
    it('should return qualified technicians ordered by skill level', async () => {
      const mockSkills = [
        {
          id: 'skill-1',
          userId: 'tech-1',
          level: SkillLevel.EXPERT,
          user: { id: 'tech-1', name: 'Expert Tech', role: UserRole.TECHNICIAN },
        },
        {
          id: 'skill-2',
          userId: 'tech-2',
          level: SkillLevel.INTERMEDIATE,
          user: { id: 'tech-2', name: 'Mid Tech', role: UserRole.TECHNICIAN },
        },
        {
          id: 'skill-3',
          userId: 'tech-3',
          level: SkillLevel.BASIC,
          user: { id: 'tech-3', name: 'Junior Tech', role: UserRole.TECHNICIAN },
        },
      ];
      prisma.technicianSkill.findMany.mockResolvedValue(mockSkills);

      const result = await service.getTechniciansForService(serviceId, tenantId);

      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe('tech-1');
      expect(result[0].level).toBe(SkillLevel.EXPERT);
      expect(prisma.technicianSkill.findMany).toHaveBeenCalledWith({
        where: { serviceId, tenantId },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { level: 'desc' },
      });
    });

    it('should return empty array when no qualified technicians', async () => {
      prisma.technicianSkill.findMany.mockResolvedValue([]);

      const result = await service.getTechniciansForService(serviceId, tenantId);

      expect(result).toEqual([]);
    });
  });

  describe('removeSkill', () => {
    it('should delete a specific skill', async () => {
      prisma.technicianSkill.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeSkill(userId, serviceId, tenantId);

      expect(prisma.technicianSkill.deleteMany).toHaveBeenCalledWith({
        where: { userId, serviceId, tenantId },
      });
    });
  });

  describe('hasSkillForService', () => {
    it('should return true if technician has skill for service', async () => {
      prisma.technicianSkill.findFirst.mockResolvedValue({
        id: 'skill-1',
        userId,
        serviceId,
        level: SkillLevel.EXPERT,
      });

      const result = await service.hasSkillForService(userId, serviceId, tenantId);

      expect(result).toBe(true);
    });

    it('should return false if technician lacks skill for service', async () => {
      prisma.technicianSkill.findFirst.mockResolvedValue(null);

      const result = await service.hasSkillForService(userId, serviceId, tenantId);

      expect(result).toBe(false);
    });
  });

  describe('getSkillLevel', () => {
    it('should return the skill level for a technician and service', async () => {
      prisma.technicianSkill.findFirst.mockResolvedValue({
        id: 'skill-1',
        userId,
        serviceId,
        level: SkillLevel.EXPERT,
      });

      const result = await service.getSkillLevel(userId, serviceId, tenantId);

      expect(result).toBe(SkillLevel.EXPERT);
    });

    it('should return null if no skill exists', async () => {
      prisma.technicianSkill.findFirst.mockResolvedValue(null);

      const result = await service.getSkillLevel(userId, serviceId, tenantId);

      expect(result).toBeNull();
    });
  });
});
