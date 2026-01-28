import { Test, TestingModule } from '@nestjs/testing';
import { SmartDispatchService, TechnicianScore } from './smart-dispatch.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { TechnicianSkillsService } from '../team/technician-skills.service';
import { RouteOptimizationService } from './route-optimization.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock';
import { SkillLevel, UserRole, UserStatus } from '@prisma/client';

describe('SmartDispatchService', () => {
  let service: SmartDispatchService;
  let prisma: MockPrismaService;
  let skillsService: jest.Mocked<TechnicianSkillsService>;
  let routeService: jest.Mocked<RouteOptimizationService>;

  const tenantId = 'tenant-1';
  const serviceId = 'service-1';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    skillsService = {
      getTechniciansForService: jest.fn(),
      getSkillLevel: jest.fn(),
    } as any;
    routeService = {
      getTechnicianLocation: jest.fn(),
      calculateETA: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartDispatchService,
        { provide: PrismaService, useValue: prisma },
        { provide: TechnicianSkillsService, useValue: skillsService },
        { provide: RouteOptimizationService, useValue: routeService },
      ],
    }).compile();

    service = module.get<SmartDispatchService>(SmartDispatchService);
  });

  describe('findBestTechnician', () => {
    it('should rank technicians by skill level (EXPERT first)', async () => {
      const date = new Date('2026-01-28T10:00:00Z');

      skillsService.getTechniciansForService.mockResolvedValue([
        { userId: 'tech-1', userName: 'Expert', level: SkillLevel.EXPERT },
        { userId: 'tech-2', userName: 'Mid', level: SkillLevel.INTERMEDIATE },
        { userId: 'tech-3', userName: 'Basic', level: SkillLevel.BASIC },
      ]);

      prisma.user.findMany.mockResolvedValue([
        { id: 'tech-1', name: 'Expert', tenantId, role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
        { id: 'tech-2', name: 'Mid', tenantId, role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
        { id: 'tech-3', name: 'Basic', tenantId, role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
      ]);

      prisma.appointment.count.mockResolvedValue(2);
      routeService.getTechnicianLocation.mockResolvedValue(null);

      const result = await service.findBestTechnician({
        tenantId,
        serviceId,
        date,
      });

      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe('tech-1');
      expect(result[0].skillLevel).toBe(SkillLevel.EXPERT);
      expect(result[0].skillScore).toBe(100);
      expect(result[1].skillScore).toBe(60);
      expect(result[2].skillScore).toBe(30);
    });

    it('should consider proximity when skill levels are equal', async () => {
      const date = new Date('2026-01-28T10:00:00Z');
      const location = { lat: 40.7128, lng: -74.006 };

      skillsService.getTechniciansForService.mockResolvedValue([
        { userId: 'tech-1', userName: 'Tech A', level: SkillLevel.EXPERT },
        { userId: 'tech-2', userName: 'Tech B', level: SkillLevel.EXPERT },
      ]);

      prisma.user.findMany.mockResolvedValue([
        { id: 'tech-1', name: 'Tech A', tenantId, role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
        { id: 'tech-2', name: 'Tech B', tenantId, role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
      ]);

      prisma.appointment.count.mockResolvedValue(2);

      // Tech-1 is closer (5km away), Tech-2 is farther (20km away)
      routeService.getTechnicianLocation.mockImplementation(async (userId: string) => {
        if (userId === 'tech-1') {
          return { latitude: 40.72, longitude: -74.01 }; // ~1km away
        }
        return { latitude: 40.85, longitude: -73.85 }; // ~20km away
      });

      const result = await service.findBestTechnician({
        tenantId,
        serviceId,
        date,
        location,
      });

      expect(result).toHaveLength(2);
      // Tech-1 should be ranked higher due to proximity
      expect(result[0].userId).toBe('tech-1');
      expect(result[0].proximityScore).toBeGreaterThan(result[1].proximityScore);
    });

    it('should consider workload when skill and proximity are equal', async () => {
      const date = new Date('2026-01-28T10:00:00Z');

      skillsService.getTechniciansForService.mockResolvedValue([
        { userId: 'tech-1', userName: 'Busy', level: SkillLevel.EXPERT },
        { userId: 'tech-2', userName: 'Light', level: SkillLevel.EXPERT },
      ]);

      prisma.user.findMany.mockResolvedValue([
        { id: 'tech-1', name: 'Busy', tenantId, role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
        { id: 'tech-2', name: 'Light', tenantId, role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
      ]);

      prisma.appointment.count.mockImplementation(async ({ where }: any) => {
        // Tech-1 has 5 jobs, Tech-2 has 1 job
        return where.assignedTo === 'tech-1' ? 5 : 1;
      });

      routeService.getTechnicianLocation.mockResolvedValue(null);

      const result = await service.findBestTechnician({
        tenantId,
        serviceId,
        date,
      });

      expect(result).toHaveLength(2);
      // Tech-2 should be ranked higher due to lighter workload
      expect(result[0].userId).toBe('tech-2');
      expect(result[0].workloadScore).toBeGreaterThan(result[1].workloadScore);
    });

    it('should include technicians with no skill match at lower score', async () => {
      const date = new Date('2026-01-28T10:00:00Z');

      // No skilled technicians for this service
      skillsService.getTechniciansForService.mockResolvedValue([]);

      // But we have active technicians
      prisma.user.findMany.mockResolvedValue([
        { id: 'tech-1', name: 'Unskilled', tenantId, role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
      ]);

      prisma.appointment.count.mockResolvedValue(0);
      routeService.getTechnicianLocation.mockResolvedValue(null);
      skillsService.getSkillLevel.mockResolvedValue(null);

      const result = await service.findBestTechnician({
        tenantId,
        serviceId,
        date,
      });

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('tech-1');
      expect(result[0].skillLevel).toBeNull();
      expect(result[0].skillScore).toBe(0);
    });

    it('should respect technician availability', async () => {
      const date = new Date('2026-01-28T10:00:00Z');

      skillsService.getTechniciansForService.mockResolvedValue([
        { userId: 'tech-1', userName: 'Expert', level: SkillLevel.EXPERT },
      ]);

      // Tech-1 is on time off
      prisma.user.findMany.mockResolvedValue([]);

      prisma.appointment.count.mockResolvedValue(0);

      const result = await service.findBestTechnician({
        tenantId,
        serviceId,
        date,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('suggestReassignment', () => {
    it('should find alternative when job runs long', async () => {
      const jobId = 'job-1';

      const mockJob = {
        id: jobId,
        tenantId,
        technicianId: 'tech-1',
        appointment: {
          id: 'appt-1',
          serviceId,
          scheduledAt: new Date('2026-01-28T10:00:00Z'),
          duration: 60,
          customer: {
            location: { latitude: 40.7128, longitude: -74.006 },
          },
        },
      };

      prisma.job.findUnique.mockResolvedValue(mockJob);

      // Next appointments for the technician
      prisma.appointment.findMany.mockResolvedValue([
        {
          id: 'appt-2',
          scheduledAt: new Date('2026-01-28T11:00:00Z'),
          customer: { name: 'Customer 2' },
        },
      ]);

      skillsService.getTechniciansForService.mockResolvedValue([
        { userId: 'tech-2', userName: 'Backup', level: SkillLevel.INTERMEDIATE },
      ]);

      prisma.user.findMany.mockResolvedValue([
        { id: 'tech-2', name: 'Backup', tenantId, role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
      ]);

      prisma.appointment.count.mockResolvedValue(1);
      routeService.getTechnicianLocation.mockResolvedValue(null);
      skillsService.getSkillLevel.mockResolvedValue(SkillLevel.INTERMEDIATE);

      const result = await service.suggestReassignment(jobId, tenantId);

      expect(result).not.toBeNull();
      expect(result?.suggestedTechnician.userId).toBe('tech-2');
      expect(result?.affectedAppointments).toHaveLength(1);
    });

    it('should return null when no alternatives available', async () => {
      const jobId = 'job-1';

      prisma.job.findUnique.mockResolvedValue({
        id: jobId,
        tenantId,
        technicianId: 'tech-1',
        appointment: {
          id: 'appt-1',
          serviceId,
          scheduledAt: new Date(),
          duration: 60,
          customer: { location: null },
        },
      });

      prisma.appointment.findMany.mockResolvedValue([]);
      skillsService.getTechniciansForService.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.suggestReassignment(jobId, tenantId);

      expect(result).toBeNull();
    });
  });

  describe('fillCancellationGap', () => {
    it('should find nearby pending jobs that fit the gap', async () => {
      const technicianId = 'tech-1';
      const date = new Date('2026-01-28');
      const startTime = new Date('2026-01-28T10:00:00Z');
      const endTime = new Date('2026-01-28T12:00:00Z');

      // Get technician's current location
      routeService.getTechnicianLocation.mockResolvedValue({
        latitude: 40.7128,
        longitude: -74.006,
      });

      // Find pending appointments nearby
      prisma.appointment.findMany.mockResolvedValue([
        {
          id: 'appt-1',
          duration: 60, // fits in 2-hour gap
          customer: {
            name: 'Nearby Customer',
            location: { latitude: 40.72, longitude: -74.01 },
          },
          service: { id: 'service-1', name: 'HVAC' },
        },
        {
          id: 'appt-2',
          duration: 180, // does not fit in 2-hour gap
          customer: {
            name: 'Far Customer',
            location: { latitude: 40.85, longitude: -73.85 },
          },
          service: { id: 'service-1', name: 'HVAC' },
        },
      ]);

      skillsService.getSkillLevel.mockResolvedValue(SkillLevel.EXPERT);

      const result = await service.fillCancellationGap(
        technicianId,
        date,
        startTime,
        endTime,
        tenantId,
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].appointmentId).toBe('appt-1');
      expect(result[0].fitsInGap).toBe(true);
    });

    it('should consider job duration when suggesting gap fillers', async () => {
      const technicianId = 'tech-1';
      const date = new Date('2026-01-28');
      const startTime = new Date('2026-01-28T10:00:00Z');
      const endTime = new Date('2026-01-28T11:00:00Z'); // Only 1 hour gap

      routeService.getTechnicianLocation.mockResolvedValue({
        latitude: 40.7128,
        longitude: -74.006,
      });

      prisma.appointment.findMany.mockResolvedValue([
        {
          id: 'appt-1',
          duration: 90, // 90 mins does not fit in 1-hour gap
          customer: {
            name: 'Customer',
            location: { latitude: 40.72, longitude: -74.01 },
          },
          service: { id: 'service-1', name: 'HVAC' },
        },
      ]);

      skillsService.getSkillLevel.mockResolvedValue(SkillLevel.EXPERT);

      const result = await service.fillCancellationGap(
        technicianId,
        date,
        startTime,
        endTime,
        tenantId,
      );

      // The appointment should be suggested but marked as not fitting
      expect(result.length).toBe(1);
      expect(result[0].fitsInGap).toBe(false);
    });
  });
});
