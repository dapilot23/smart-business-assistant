import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../config/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/prisma-mock';
import { RetentionCronService } from './retention-cron.service';
import { RetentionSequenceService } from './retention-sequence.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('RetentionCronService', () => {
  let service: RetentionCronService;
  let prisma: MockPrismaService;
  let retentionSequenceService: {
    createSequence: jest.Mock;
    cancelSequence: jest.Mock;
    getActiveCampaigns: jest.Mock;
  };
  let notifications: { queueSms: jest.Mock; queueEmail: jest.Mock };

  const NOW = new Date('2026-01-28T12:00:00Z');

  beforeEach(async () => {
    jest.useFakeTimers({ now: NOW });

    prisma = createMockPrismaService();
    retentionSequenceService = {
      createSequence: jest.fn(),
      cancelSequence: jest.fn(),
      getActiveCampaigns: jest.fn(),
    };
    notifications = { queueSms: jest.fn(), queueEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionCronService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: RetentionSequenceService,
          useValue: retentionSequenceService,
        },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<RetentionCronService>(RetentionCronService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('detectDormantCustomers', () => {
    it('should find customers with no appointment in 90+ days and create sequences', async () => {
      const cutoff = new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000);
      const tenant = {
        id: 'tenant-1',
        settings: { retentionEnabled: true, retentionDormantDays: null },
      };
      const customer = {
        id: 'cust-1',
        lifecycleStage: 'ACTIVE',
        appointments: [
          { scheduledAt: new Date(cutoff.getTime() - 1000) },
        ],
        retentionCampaigns: [],
      };

      prisma.tenant.findMany.mockResolvedValue([tenant]);
      prisma.customer.findMany.mockResolvedValue([customer]);
      prisma.customer.update.mockResolvedValue({});

      await service.detectDormantCustomers();

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { lifecycleStage: 'DORMANT' },
      });
      expect(retentionSequenceService.createSequence).toHaveBeenCalledWith(
        'tenant-1',
        'cust-1',
        'DORMANT_WINBACK',
      );
    });

    it('should respect tenant-specific dormant threshold', async () => {
      const tenant = {
        id: 'tenant-2',
        settings: { retentionEnabled: true, retentionDormantDays: 60 },
      };
      const cutoff60 = new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000);
      const customer = {
        id: 'cust-2',
        lifecycleStage: 'ACTIVE',
        appointments: [
          { scheduledAt: new Date(cutoff60.getTime() - 1000) },
        ],
        retentionCampaigns: [],
      };

      prisma.tenant.findMany.mockResolvedValue([tenant]);
      prisma.customer.findMany.mockResolvedValue([customer]);
      prisma.customer.update.mockResolvedValue({});

      await service.detectDormantCustomers();

      expect(retentionSequenceService.createSequence).toHaveBeenCalledWith(
        'tenant-2',
        'cust-2',
        'DORMANT_WINBACK',
      );
    });

    it('should skip customers already in active retention campaign', async () => {
      const cutoff = new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000);
      const tenant = {
        id: 'tenant-1',
        settings: { retentionEnabled: true },
      };
      const customer = {
        id: 'cust-3',
        lifecycleStage: 'ACTIVE',
        appointments: [
          { scheduledAt: new Date(cutoff.getTime() - 1000) },
        ],
        retentionCampaigns: [{ id: 'campaign-existing', status: 'PENDING' }],
      };

      prisma.tenant.findMany.mockResolvedValue([tenant]);
      prisma.customer.findMany.mockResolvedValue([customer]);

      await service.detectDormantCustomers();

      expect(retentionSequenceService.createSequence).not.toHaveBeenCalled();
      expect(prisma.customer.update).not.toHaveBeenCalled();
    });

    it('should skip customers with lifecycleStage LOST', async () => {
      const tenant = {
        id: 'tenant-1',
        settings: { retentionEnabled: true },
      };

      prisma.tenant.findMany.mockResolvedValue([tenant]);
      prisma.customer.findMany.mockResolvedValue([]);

      await service.detectDormantCustomers();

      const query = prisma.customer.findMany.mock.calls[0][0];
      expect(query.where.lifecycleStage).toEqual({ not: 'LOST' });
      expect(retentionSequenceService.createSequence).not.toHaveBeenCalled();
    });

    it('should update customer lifecycleStage to DORMANT', async () => {
      const cutoff = new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000);
      const tenant = {
        id: 'tenant-1',
        settings: { retentionEnabled: true },
      };
      const customers = [
        {
          id: 'cust-a',
          lifecycleStage: 'ACTIVE',
          appointments: [{ scheduledAt: new Date(cutoff.getTime() - 5000) }],
          retentionCampaigns: [],
        },
        {
          id: 'cust-b',
          lifecycleStage: 'ACTIVE',
          appointments: [{ scheduledAt: new Date(cutoff.getTime() - 2000) }],
          retentionCampaigns: [],
        },
      ];

      prisma.tenant.findMany.mockResolvedValue([tenant]);
      prisma.customer.findMany.mockResolvedValue(customers);
      prisma.customer.update.mockResolvedValue({});

      await service.detectDormantCustomers();

      expect(prisma.customer.update).toHaveBeenCalledTimes(2);
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-a' },
        data: { lifecycleStage: 'DORMANT' },
      });
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-b' },
        data: { lifecycleStage: 'DORMANT' },
      });
    });

    it('should skip tenants with retention disabled', async () => {
      const tenants = [
        { id: 'tenant-off', settings: { retentionEnabled: false } },
        { id: 'tenant-on', settings: { retentionEnabled: true } },
      ];

      prisma.tenant.findMany.mockResolvedValue(tenants);
      prisma.customer.findMany.mockResolvedValue([]);

      await service.detectDormantCustomers();

      expect(prisma.customer.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.customer.findMany.mock.calls[0][0].where.tenantId).toBe(
        'tenant-on',
      );
    });

    it('should handle empty tenant list', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);

      await service.detectDormantCustomers();

      expect(prisma.customer.findMany).not.toHaveBeenCalled();
      expect(retentionSequenceService.createSequence).not.toHaveBeenCalled();
    });
  });

  describe('sendMaintenanceReminders', () => {
    it('should find customers due for service and send SMS', async () => {
      const intervalDays = 180;
      const dueDate = new Date(NOW.getTime() - intervalDays * 24 * 60 * 60 * 1000);
      const interval = {
        id: 'interval-1',
        tenantId: 'tenant-1',
        serviceId: 'service-1',
        intervalDays,
        reminderDays: 7,
        service: { name: 'Oil Change' },
        tenant: { id: 'tenant-1' },
      };
      const customer = {
        id: 'cust-1',
        name: 'John',
        phone: '+15551234567',
        tenantId: 'tenant-1',
        appointments: [
          { scheduledAt: new Date(dueDate.getTime() - 1000) },
        ],
      };

      prisma.serviceInterval.findMany.mockResolvedValue([interval]);
      prisma.customer.findMany.mockResolvedValue([customer]);

      await service.sendMaintenanceReminders();

      expect(notifications.queueSms).toHaveBeenCalledTimes(1);
      const [phone, message, tenantId] =
        notifications.queueSms.mock.calls[0];
      expect(phone).toBe('+15551234567');
      expect(message).toContain('John');
      expect(message).toContain('Oil Change');
      expect(message).toContain('6 months');
      expect(tenantId).toBe('tenant-1');
    });

    it('should calculate months since last service correctly', async () => {
      const intervalDays = 90;
      const dueDate = new Date(NOW.getTime() - intervalDays * 24 * 60 * 60 * 1000);
      const interval = {
        id: 'interval-2',
        tenantId: 'tenant-1',
        serviceId: 'service-2',
        intervalDays,
        reminderDays: 7,
        service: { name: 'Tune-Up' },
        tenant: { id: 'tenant-1' },
      };
      const customer = {
        id: 'cust-2',
        name: 'Jane',
        phone: '+15559876543',
        tenantId: 'tenant-1',
        appointments: [
          { scheduledAt: new Date(dueDate.getTime() - 1000) },
        ],
      };

      prisma.serviceInterval.findMany.mockResolvedValue([interval]);
      prisma.customer.findMany.mockResolvedValue([customer]);

      await service.sendMaintenanceReminders();

      const message = notifications.queueSms.mock.calls[0][1];
      expect(message).toContain('3 months');
    });

    it('should skip customers without phone', async () => {
      const intervalDays = 180;
      const dueDate = new Date(NOW.getTime() - intervalDays * 24 * 60 * 60 * 1000);
      const interval = {
        id: 'interval-3',
        tenantId: 'tenant-1',
        serviceId: 'service-1',
        intervalDays,
        reminderDays: 7,
        service: { name: 'Oil Change' },
        tenant: { id: 'tenant-1' },
      };
      const customer = {
        id: 'cust-3',
        name: 'NoPhone',
        phone: null,
        tenantId: 'tenant-1',
        appointments: [
          { scheduledAt: new Date(dueDate.getTime() - 1000) },
        ],
      };

      prisma.serviceInterval.findMany.mockResolvedValue([interval]);
      prisma.customer.findMany.mockResolvedValue([customer]);

      await service.sendMaintenanceReminders();

      expect(notifications.queueSms).not.toHaveBeenCalled();
    });

    it('should handle no service intervals', async () => {
      prisma.serviceInterval.findMany.mockResolvedValue([]);

      await service.sendMaintenanceReminders();

      expect(prisma.customer.findMany).not.toHaveBeenCalled();
      expect(notifications.queueSms).not.toHaveBeenCalled();
    });

    it('should process multiple intervals across tenants', async () => {
      const intervals = [
        {
          id: 'int-1',
          tenantId: 'tenant-a',
          serviceId: 'svc-1',
          intervalDays: 180,
          reminderDays: 7,
          service: { name: 'Cleaning' },
          tenant: { id: 'tenant-a' },
        },
        {
          id: 'int-2',
          tenantId: 'tenant-b',
          serviceId: 'svc-2',
          intervalDays: 365,
          reminderDays: 14,
          service: { name: 'Inspection' },
          tenant: { id: 'tenant-b' },
        },
      ];

      const dueDateA = new Date(
        NOW.getTime() - 180 * 24 * 60 * 60 * 1000,
      );
      const dueDateB = new Date(
        NOW.getTime() - 365 * 24 * 60 * 60 * 1000,
      );

      const custA = {
        id: 'cust-a',
        name: 'Alice',
        phone: '+1111',
        tenantId: 'tenant-a',
        appointments: [
          { scheduledAt: new Date(dueDateA.getTime() - 1000) },
        ],
      };
      const custB = {
        id: 'cust-b',
        name: 'Bob',
        phone: '+2222',
        tenantId: 'tenant-b',
        appointments: [
          { scheduledAt: new Date(dueDateB.getTime() - 1000) },
        ],
      };

      prisma.serviceInterval.findMany.mockResolvedValue(intervals);
      prisma.customer.findMany
        .mockResolvedValueOnce([custA])
        .mockResolvedValueOnce([custB]);

      await service.sendMaintenanceReminders();

      expect(prisma.customer.findMany).toHaveBeenCalledTimes(2);
      expect(notifications.queueSms).toHaveBeenCalledTimes(2);
      expect(notifications.queueSms.mock.calls[0][2]).toBe('tenant-a');
      expect(notifications.queueSms.mock.calls[1][2]).toBe('tenant-b');
    });
  });
});
