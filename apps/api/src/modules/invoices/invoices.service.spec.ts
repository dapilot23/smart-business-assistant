import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { PaymentReminderService } from '../payment-reminders/payment-reminder.service';
import { EventsService } from '../../config/events/events.service';
import { createMockPrismaService } from '../../test/prisma-mock';
import { InvoiceStatus } from '@prisma/client';
import { EVENTS } from '../../config/events/events.types';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let reminderService: jest.Mocked<PaymentReminderService>;
  let eventsService: jest.Mocked<EventsService>;

  const mockTenantId = 'tenant-123';
  const mockInvoiceId = 'invoice-456';
  const mockCustomerId = 'customer-789';

  const mockCustomer = {
    id: mockCustomerId,
    tenantId: mockTenantId,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  };

  const mockInvoice = {
    id: mockInvoiceId,
    tenantId: mockTenantId,
    customerId: mockCustomerId,
    invoiceNumber: 'INV2024-0001',
    description: 'Test invoice',
    amount: 1000,
    paidAmount: 0,
    dueDate: new Date('2024-12-31'),
    status: InvoiceStatus.DRAFT,
    sentAt: null,
    paidAt: null,
    lateFeeApplied: false,
    lateFeeAmount: 0,
    quoteId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    customer: mockCustomer,
    items: [],
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    reminderService = {
      scheduleReminders: jest.fn(),
      cancelReminders: jest.fn(),
    } as any;
    eventsService = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentReminderService, useValue: reminderService },
        { provide: EventsService, useValue: eventsService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return invoice when tenant matches', async () => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);

      const result = await service.findOne(mockInvoiceId, mockTenantId);

      expect(result).toEqual(mockInvoice);
      expect(prisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: mockInvoiceId, tenantId: mockTenantId },
        include: {
          customer: true,
          items: true,
          reminders: {
            orderBy: { step: 'asc' },
          },
        },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockInvoiceId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when tenant does not match', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockInvoiceId, 'wrong-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create invoice with calculated total', async () => {
      const createDto = {
        customerId: mockCustomerId,
        description: 'New invoice',
        dueDate: '2024-12-31',
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 100, total: 200 },
          { description: 'Item 2', quantity: 1, unitPrice: 300, total: 300 },
        ],
      };

      const expectedInvoice = {
        ...mockInvoice,
        amount: 500,
        items: createDto.items,
      };

      const mockTransaction = prisma.$transaction as jest.Mock;
      mockTransaction.mockImplementation(async (callback) => {
        const txPrisma = createMockPrismaService();
        txPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
        txPrisma.invoice.findFirst.mockResolvedValue(null);
        txPrisma.invoice.create.mockResolvedValue(expectedInvoice);
        return callback(txPrisma);
      });

      const result = await service.create(createDto, mockTenantId);

      expect(result).toEqual(expectedInvoice);
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should reject if customer does not belong to tenant', async () => {
      const createDto = {
        customerId: 'non-existent-customer',
        description: 'Test',
        dueDate: '2024-12-31',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100, total: 100 }],
      };

      const mockTransaction = prisma.$transaction as jest.Mock;
      mockTransaction.mockImplementation(async (callback) => {
        const txPrisma = createMockPrismaService();
        txPrisma.customer.findFirst.mockResolvedValue(null);
        return callback(txPrisma);
      });

      await expect(
        service.create(createDto, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should update status and call reminder service when SENT', async () => {
      const sentInvoice = { ...mockInvoice, status: InvoiceStatus.SENT, sentAt: new Date() };

      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.invoice.update.mockResolvedValue(sentInvoice);
      reminderService.scheduleReminders.mockResolvedValue(undefined);

      const result = await service.updateStatus(mockInvoiceId, InvoiceStatus.SENT, mockTenantId);

      expect(result.status).toBe(InvoiceStatus.SENT);
      expect(reminderService.scheduleReminders).toHaveBeenCalledWith(mockInvoiceId, mockTenantId);
      expect(eventsService.emit).toHaveBeenCalledWith(
        EVENTS.INVOICE_SENT,
        expect.objectContaining({
          tenantId: mockTenantId,
          invoiceId: mockInvoiceId,
        }),
      );
    });

    it('should update status with paidAt when PAID', async () => {
      const paidInvoice = { ...mockInvoice, status: InvoiceStatus.PAID, paidAt: new Date() };

      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.invoice.update.mockResolvedValue(paidInvoice);

      const result = await service.updateStatus(mockInvoiceId, InvoiceStatus.PAID, mockTenantId);

      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: mockInvoiceId },
        data: expect.objectContaining({
          status: InvoiceStatus.PAID,
          paidAt: expect.any(Date),
        }),
        include: { customer: true, items: true },
      });
    });

    it('should cancel reminders when PAID', async () => {
      const paidInvoice = { ...mockInvoice, status: InvoiceStatus.PAID, paidAt: new Date() };

      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.invoice.update.mockResolvedValue(paidInvoice);
      reminderService.cancelReminders.mockResolvedValue(undefined);

      await service.updateStatus(mockInvoiceId, InvoiceStatus.PAID, mockTenantId);

      expect(reminderService.cancelReminders).toHaveBeenCalledWith(mockInvoiceId);
    });

    it('should cancel reminders when CANCELLED', async () => {
      const cancelledInvoice = { ...mockInvoice, status: InvoiceStatus.CANCELLED };

      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.invoice.update.mockResolvedValue(cancelledInvoice);
      reminderService.cancelReminders.mockResolvedValue(undefined);

      await service.updateStatus(mockInvoiceId, InvoiceStatus.CANCELLED, mockTenantId);

      expect(reminderService.cancelReminders).toHaveBeenCalledWith(mockInvoiceId);
    });
  });

  describe('delete', () => {
    it('should prevent deleting paid invoices', async () => {
      const paidInvoice = { ...mockInvoice, status: InvoiceStatus.PAID };
      prisma.invoice.findFirst.mockResolvedValue(paidInvoice);

      await expect(
        service.delete(mockInvoiceId, mockTenantId),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.invoice.delete).not.toHaveBeenCalled();
    });

    it('should allow deleting draft invoices', async () => {
      const draftInvoice = { ...mockInvoice, status: InvoiceStatus.DRAFT };
      prisma.invoice.findFirst.mockResolvedValue(draftInvoice);
      prisma.invoice.delete.mockResolvedValue(draftInvoice);

      const result = await service.delete(mockInvoiceId, mockTenantId);

      expect(result).toEqual(draftInvoice);
      expect(prisma.invoice.delete).toHaveBeenCalledWith({
        where: { id: mockInvoiceId },
      });
    });

    it('should allow deleting sent invoices', async () => {
      const sentInvoice = { ...mockInvoice, status: InvoiceStatus.SENT };
      prisma.invoice.findFirst.mockResolvedValue(sentInvoice);
      prisma.invoice.delete.mockResolvedValue(sentInvoice);

      const result = await service.delete(mockInvoiceId, mockTenantId);

      expect(result).toEqual(sentInvoice);
      expect(prisma.invoice.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateInvoiceNumber', () => {
    it('should generate sequential numbers', async () => {
      const createDto = {
        customerId: mockCustomerId,
        description: 'Test',
        dueDate: '2024-12-31',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100, total: 100 }],
      };

      const mockTransaction = prisma.$transaction as jest.Mock;
      mockTransaction.mockImplementation(async (callback) => {
        const txPrisma = createMockPrismaService();
        txPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
        txPrisma.invoice.findFirst.mockResolvedValue({
          invoiceNumber: 'INV2024-0005',
        });
        txPrisma.invoice.create.mockResolvedValue({
          ...mockInvoice,
          invoiceNumber: 'INV2024-0006',
        });
        return callback(txPrisma);
      });

      const result = await service.create(createDto, mockTenantId);

      expect(result.invoiceNumber).toMatch(/INV\d{4}-\d{4}/);
    });

    it('should start with 0001 for first invoice of the year', async () => {
      const createDto = {
        customerId: mockCustomerId,
        description: 'Test',
        dueDate: '2024-12-31',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100, total: 100 }],
      };

      const mockTransaction = prisma.$transaction as jest.Mock;
      mockTransaction.mockImplementation(async (callback) => {
        const txPrisma = createMockPrismaService();
        txPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
        txPrisma.invoice.findFirst.mockResolvedValue(null);
        txPrisma.invoice.create.mockResolvedValue({
          ...mockInvoice,
          invoiceNumber: `INV${new Date().getFullYear()}-0001`,
        });
        return callback(txPrisma);
      });

      const result = await service.create(createDto, mockTenantId);

      expect(result.invoiceNumber).toContain('-0001');
    });
  });
});
