import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EventsService } from '../../config/events/events.service';
import { QuoteFollowupService } from './quote-followup.service';
import { createMockPrismaService } from '../../test/prisma-mock';
import { QuoteStatus } from '@prisma/client';
import { EVENTS } from '../../config/events/events.types';

describe('QuotesService', () => {
  let service: QuotesService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let eventsService: jest.Mocked<EventsService>;
  let followupService: jest.Mocked<QuoteFollowupService>;

  const mockTenantId = 'tenant-123';
  const mockQuoteId = 'quote-456';
  const mockCustomerId = 'customer-789';

  const mockCustomer = {
    id: mockCustomerId,
    tenantId: mockTenantId,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  };

  const mockQuote = {
    id: mockQuoteId,
    tenantId: mockTenantId,
    customerId: mockCustomerId,
    quoteNumber: 'Q2024-0001',
    description: 'Test quote',
    amount: 1000,
    validUntil: new Date('2024-12-31'),
    status: QuoteStatus.DRAFT,
    sentAt: null,
    convertedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    customer: mockCustomer,
    items: [],
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    eventsService = {
      emit: jest.fn(),
    } as any;
    followupService = {
      scheduleFollowUps: jest.fn(),
      cancelFollowUps: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: eventsService },
        { provide: QuoteFollowupService, useValue: followupService },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return quote when tenant matches', async () => {
      prisma.quote.findFirst.mockResolvedValue(mockQuote);

      const result = await service.findOne(mockQuoteId, mockTenantId);

      expect(result).toEqual(mockQuote);
      expect(prisma.quote.findFirst).toHaveBeenCalledWith({
        where: { id: mockQuoteId, tenantId: mockTenantId },
        include: {
          customer: true,
          items: true,
          followUps: {
            orderBy: { step: 'asc' },
          },
        },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockQuoteId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when tenant does not match', async () => {
      prisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockQuoteId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should validate customer belongs to tenant', async () => {
      const createDto = {
        customerId: mockCustomerId,
        description: 'New quote',
        amount: 500,
        validUntil: '2024-12-31',
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 100, total: 200 },
        ],
      };

      const mockTransaction = prisma.$transaction as jest.Mock;
      mockTransaction.mockImplementation(async (callback) => {
        const txPrisma = createMockPrismaService();
        txPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
        txPrisma.quote.findFirst.mockResolvedValue(null);
        txPrisma.quote.create.mockResolvedValue(mockQuote);
        return callback(txPrisma);
      });

      await service.create(createDto, mockTenantId);

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if customer not found', async () => {
      const createDto = {
        customerId: 'non-existent',
        description: 'Test',
        amount: 100,
        validUntil: '2024-12-31',
        items: [],
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

    it('should calculate total from items', async () => {
      const createDto = {
        customerId: mockCustomerId,
        description: 'Test quote',
        amount: 999,
        validUntil: '2024-12-31',
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 100, total: 200 },
          { description: 'Item 2', quantity: 1, unitPrice: 300, total: 300 },
        ],
      };

      const expectedQuote = { ...mockQuote, amount: 500 };
      let capturedCreateArgs: any;

      const mockTransaction = prisma.$transaction as jest.Mock;
      mockTransaction.mockImplementation(async (callback) => {
        const txPrisma = createMockPrismaService();
        txPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
        txPrisma.quote.findFirst.mockResolvedValue(null);
        txPrisma.quote.create.mockImplementation((args) => {
          capturedCreateArgs = args;
          return Promise.resolve(expectedQuote);
        });
        return callback(txPrisma);
      });

      await service.create(createDto, mockTenantId);

      expect(capturedCreateArgs.data.amount).toBe(500);
    });
  });

  describe('updateStatus', () => {
    it('should emit QUOTE_ACCEPTED event and cancel follow-ups', async () => {
      const acceptedQuote = { ...mockQuote, status: QuoteStatus.ACCEPTED, convertedAt: new Date() };

      prisma.quote.findFirst.mockResolvedValue(mockQuote);
      prisma.quote.update.mockResolvedValue(acceptedQuote);
      followupService.cancelFollowUps.mockResolvedValue(undefined);

      const result = await service.updateStatus(mockQuoteId, QuoteStatus.ACCEPTED, mockTenantId);

      expect(result.status).toBe(QuoteStatus.ACCEPTED);
      expect(eventsService.emit).toHaveBeenCalledWith(
        EVENTS.QUOTE_ACCEPTED,
        expect.objectContaining({
          tenantId: mockTenantId,
          quoteId: mockQuoteId,
        }),
      );
      expect(followupService.cancelFollowUps).toHaveBeenCalledWith(mockQuoteId);
    });

    it('should emit QUOTE_REJECTED event and cancel follow-ups', async () => {
      const rejectedQuote = { ...mockQuote, status: QuoteStatus.REJECTED };

      prisma.quote.findFirst.mockResolvedValue(mockQuote);
      prisma.quote.update.mockResolvedValue(rejectedQuote);
      followupService.cancelFollowUps.mockResolvedValue(undefined);

      const result = await service.updateStatus(mockQuoteId, QuoteStatus.REJECTED, mockTenantId);

      expect(result.status).toBe(QuoteStatus.REJECTED);
      expect(eventsService.emit).toHaveBeenCalledWith(
        EVENTS.QUOTE_REJECTED,
        expect.objectContaining({
          tenantId: mockTenantId,
          quoteId: mockQuoteId,
        }),
      );
      expect(followupService.cancelFollowUps).toHaveBeenCalledWith(mockQuoteId);
    });

    it('should set convertedAt when ACCEPTED', async () => {
      const acceptedQuote = { ...mockQuote, status: QuoteStatus.ACCEPTED, convertedAt: new Date() };

      prisma.quote.findFirst.mockResolvedValue(mockQuote);
      prisma.quote.update.mockResolvedValue(acceptedQuote);
      followupService.cancelFollowUps.mockResolvedValue(undefined);

      await service.updateStatus(mockQuoteId, QuoteStatus.ACCEPTED, mockTenantId);

      expect(prisma.quote.update).toHaveBeenCalledWith({
        where: { id: mockQuoteId },
        data: expect.objectContaining({
          status: QuoteStatus.ACCEPTED,
          convertedAt: expect.any(Date),
        }),
        include: { customer: true, items: true },
      });
    });

    it('should set sentAt when SENT', async () => {
      const sentQuote = { ...mockQuote, status: QuoteStatus.SENT, sentAt: new Date() };

      prisma.quote.findFirst.mockResolvedValueOnce(mockQuote);
      prisma.quote.update.mockResolvedValue(sentQuote);

      await service.updateStatus(mockQuoteId, QuoteStatus.SENT, mockTenantId);

      expect(prisma.quote.update).toHaveBeenCalledWith({
        where: { id: mockQuoteId },
        data: expect.objectContaining({
          status: QuoteStatus.SENT,
          sentAt: expect.any(Date),
        }),
        include: { customer: true, items: true },
      });
    });
  });

  describe('sendQuote', () => {
    it('should set SENT status and schedule follow-ups', async () => {
      const sentQuote = { ...mockQuote, status: QuoteStatus.SENT, sentAt: new Date() };

      prisma.quote.findFirst.mockResolvedValue(mockQuote);
      prisma.quote.update.mockResolvedValue(sentQuote);
      followupService.scheduleFollowUps.mockResolvedValue(undefined);

      const result = await service.sendQuote(mockQuoteId, mockTenantId);

      expect(result.status).toBe(QuoteStatus.SENT);
      expect(prisma.quote.update).toHaveBeenCalledWith({
        where: { id: mockQuoteId },
        data: expect.objectContaining({
          status: QuoteStatus.SENT,
          sentAt: expect.any(Date),
        }),
        include: { customer: true, items: true },
      });
      expect(eventsService.emit).toHaveBeenCalledWith(
        EVENTS.QUOTE_SENT,
        expect.objectContaining({
          tenantId: mockTenantId,
          quoteId: mockQuoteId,
        }),
      );
      expect(followupService.scheduleFollowUps).toHaveBeenCalledWith(mockTenantId, mockQuoteId);
    });
  });

  describe('delete', () => {
    it('should only allow deleting DRAFT quotes', async () => {
      const draftQuote = { ...mockQuote, status: QuoteStatus.DRAFT };

      prisma.quote.findFirst.mockResolvedValue(draftQuote);
      prisma.quote.delete.mockResolvedValue(draftQuote);

      const result = await service.delete(mockQuoteId, mockTenantId);

      expect(result).toEqual(draftQuote);
      expect(prisma.quote.delete).toHaveBeenCalledWith({
        where: { id: mockQuoteId },
      });
    });

    it('should throw BadRequestException for non-draft quotes', async () => {
      const sentQuote = { ...mockQuote, status: QuoteStatus.SENT };

      prisma.quote.findFirst.mockResolvedValue(sentQuote);

      await expect(
        service.delete(mockQuoteId, mockTenantId),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.quote.delete).not.toHaveBeenCalled();
    });

    it('should prevent deleting accepted quotes', async () => {
      const acceptedQuote = { ...mockQuote, status: QuoteStatus.ACCEPTED };

      prisma.quote.findFirst.mockResolvedValue(acceptedQuote);

      await expect(
        service.delete(mockQuoteId, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
