import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { SmartReviewService, REVIEW_PIPELINE_QUEUE } from './smart-review.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('SmartReviewService', () => {
  let service: SmartReviewService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let notifications: jest.Mocked<NotificationsService>;
  let mockQueue: { add: jest.Mock };

  const mockTenantId = 'tenant-123';
  const mockSurveyId = 'survey-456';
  const mockJobId = 'job-789';
  const mockCustomerId = 'customer-101';
  const mockReviewRequestId = 'review-req-202';

  const mockSettings = {
    tenantId: mockTenantId,
    reviewRequestEnabled: true,
    reviewMaxPerDay: 2,
    reviewTimingHours: 3,
    timezone: 'America/New_York',
    googleReviewUrl: 'https://g.page/review/test-business',
    yelpReviewUrl: null,
    facebookReviewUrl: null,
  };

  const mockCustomer = {
    id: mockCustomerId,
    tenantId: mockTenantId,
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1234567890',
  };

  const mockTenant = {
    id: mockTenantId,
    name: 'Acme Plumbing',
  };

  const mockCreatedReviewRequest = {
    id: mockReviewRequestId,
    tenantId: mockTenantId,
    jobId: mockJobId,
    customerId: mockCustomerId,
    npsScore: 10,
    npsGated: true,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    notifications = {
      queueSms: jest.fn(),
      queueEmail: jest.fn(),
    } as any;
    mockQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartReviewService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: getQueueToken(REVIEW_PIPELINE_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<SmartReviewService>(SmartReviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleNpsScore', () => {
    const basePayload = {
      tenantId: mockTenantId,
      surveyId: mockSurveyId,
      jobId: mockJobId,
      customerId: mockCustomerId,
      score: 10,
      feedback: 'Great service!',
    };

    describe('promoter (score >= 9)', () => {
      it('should create ReviewRequest with npsGated=true and enqueue BullMQ job', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue(mockSettings);
        prisma.reviewRequest.count.mockResolvedValue(0);
        prisma.reviewRequest.findUnique.mockResolvedValue(null);
        prisma.reviewRequest.create.mockResolvedValue(mockCreatedReviewRequest);
        mockQueue.add.mockResolvedValue({});

        await service.handleNpsScore({ ...basePayload, score: 10 });

        expect(prisma.reviewRequest.create).toHaveBeenCalledWith({
          data: {
            tenantId: mockTenantId,
            jobId: mockJobId,
            customerId: mockCustomerId,
            npsScore: 10,
            npsGated: true,
            status: 'PENDING',
          },
        });

        expect(mockQueue.add).toHaveBeenCalledWith(
          'send-review-request',
          {
            tenantId: mockTenantId,
            reviewRequestId: mockReviewRequestId,
            customerId: mockCustomerId,
            jobId: mockJobId,
            platform: 'Google',
            reviewUrl: 'https://g.page/review/test-business',
          },
          expect.objectContaining({
            delay: expect.any(Number),
            jobId: `review-${mockReviewRequestId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 60000 },
          }),
        );
      });

      it('should also trigger for score of exactly 9', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue(mockSettings);
        prisma.reviewRequest.count.mockResolvedValue(0);
        prisma.reviewRequest.findUnique.mockResolvedValue(null);
        prisma.reviewRequest.create.mockResolvedValue(mockCreatedReviewRequest);
        mockQueue.add.mockResolvedValue({});

        await service.handleNpsScore({ ...basePayload, score: 9 });

        expect(prisma.reviewRequest.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            npsScore: 9,
            npsGated: true,
          }),
        });
        expect(mockQueue.add).toHaveBeenCalledTimes(1);
      });
    });

    describe('passive (score 7-8)', () => {
      it('should send feedback email and NOT create ReviewRequest', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue(mockSettings);
        prisma.customer.findUnique.mockResolvedValue(mockCustomer);
        prisma.tenant.findUnique.mockResolvedValue(mockTenant);
        notifications.queueEmail.mockResolvedValue(undefined);

        await service.handleNpsScore({ ...basePayload, score: 7 });

        expect(prisma.reviewRequest.create).not.toHaveBeenCalled();
        expect(mockQueue.add).not.toHaveBeenCalled();
        expect(notifications.queueEmail).toHaveBeenCalledWith(
          mockCustomer.email,
          `How can we improve? - ${mockTenant.name}`,
          'passive-feedback',
          {
            customerName: mockCustomer.name,
            businessName: mockTenant.name,
            feedback: basePayload.feedback,
          },
          mockTenantId,
        );
      });

      it('should send feedback email for score of 8', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue(mockSettings);
        prisma.customer.findUnique.mockResolvedValue(mockCustomer);
        prisma.tenant.findUnique.mockResolvedValue(mockTenant);
        notifications.queueEmail.mockResolvedValue(undefined);

        await service.handleNpsScore({ ...basePayload, score: 8 });

        expect(prisma.reviewRequest.create).not.toHaveBeenCalled();
        expect(notifications.queueEmail).toHaveBeenCalledTimes(1);
      });

      it('should skip email when customer has no email address', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue(mockSettings);
        prisma.customer.findUnique.mockResolvedValue({
          ...mockCustomer,
          email: null,
        });

        await service.handleNpsScore({ ...basePayload, score: 7 });

        expect(notifications.queueEmail).not.toHaveBeenCalled();
      });
    });

    describe('detractor (score <= 6)', () => {
      it('should do nothing for detractor scores', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue(mockSettings);

        await service.handleNpsScore({ ...basePayload, score: 6 });

        expect(prisma.reviewRequest.create).not.toHaveBeenCalled();
        expect(mockQueue.add).not.toHaveBeenCalled();
        expect(notifications.queueEmail).not.toHaveBeenCalled();
        expect(notifications.queueSms).not.toHaveBeenCalled();
      });

      it('should do nothing for score of 0', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue(mockSettings);

        await service.handleNpsScore({ ...basePayload, score: 0 });

        expect(prisma.reviewRequest.create).not.toHaveBeenCalled();
        expect(mockQueue.add).not.toHaveBeenCalled();
        expect(notifications.queueEmail).not.toHaveBeenCalled();
      });
    });

    describe('reviews disabled', () => {
      it('should do nothing when reviewRequestEnabled is false', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue({
          ...mockSettings,
          reviewRequestEnabled: false,
        });

        await service.handleNpsScore({ ...basePayload, score: 10 });

        expect(prisma.reviewRequest.create).not.toHaveBeenCalled();
        expect(prisma.reviewRequest.count).not.toHaveBeenCalled();
        expect(mockQueue.add).not.toHaveBeenCalled();
        expect(notifications.queueEmail).not.toHaveBeenCalled();
      });

      it('should do nothing when tenantSettings is null', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue(null);

        await service.handleNpsScore({ ...basePayload, score: 10 });

        expect(prisma.reviewRequest.create).not.toHaveBeenCalled();
        expect(mockQueue.add).not.toHaveBeenCalled();
      });
    });

    describe('daily limit reached', () => {
      it('should skip when reviewMaxPerDay is exceeded', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue({
          ...mockSettings,
          reviewMaxPerDay: 2,
        });
        prisma.reviewRequest.count.mockResolvedValue(2);

        await service.handleNpsScore({ ...basePayload, score: 10 });

        expect(prisma.reviewRequest.count).toHaveBeenCalledWith({
          where: {
            tenantId: mockTenantId,
            npsGated: true,
            createdAt: { gte: expect.any(Date) },
          },
        });
        expect(prisma.reviewRequest.create).not.toHaveBeenCalled();
        expect(mockQueue.add).not.toHaveBeenCalled();
      });

      it('should use default maxPerDay of 2 when not configured', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue({
          ...mockSettings,
          reviewMaxPerDay: undefined,
        });
        prisma.reviewRequest.count.mockResolvedValue(2);

        await service.handleNpsScore({ ...basePayload, score: 9 });

        expect(prisma.reviewRequest.create).not.toHaveBeenCalled();
        expect(mockQueue.add).not.toHaveBeenCalled();
      });
    });

    describe('existing review request', () => {
      it('should skip when ReviewRequest already exists for jobId', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue(mockSettings);
        prisma.reviewRequest.count.mockResolvedValue(0);
        prisma.reviewRequest.findUnique.mockResolvedValue(mockCreatedReviewRequest);

        await service.handleNpsScore({ ...basePayload, score: 10 });

        expect(prisma.reviewRequest.findUnique).toHaveBeenCalledWith({
          where: { jobId: mockJobId },
        });
        expect(prisma.reviewRequest.create).not.toHaveBeenCalled();
        expect(mockQueue.add).not.toHaveBeenCalled();
      });
    });

    describe('no platform URL', () => {
      it('should skip when no review URLs are configured', async () => {
        prisma.tenantSettings.findUnique.mockResolvedValue({
          ...mockSettings,
          googleReviewUrl: null,
          yelpReviewUrl: null,
          facebookReviewUrl: null,
        });
        prisma.reviewRequest.count.mockResolvedValue(0);
        prisma.reviewRequest.findUnique.mockResolvedValue(null);

        await service.handleNpsScore({ ...basePayload, score: 10 });

        expect(prisma.reviewRequest.create).not.toHaveBeenCalled();
        expect(mockQueue.add).not.toHaveBeenCalled();
      });

      it('should use Yelp URL when Google is not configured', async () => {
        const yelpUrl = 'https://yelp.com/biz/test-business';
        prisma.tenantSettings.findUnique.mockResolvedValue({
          ...mockSettings,
          googleReviewUrl: null,
          yelpReviewUrl: yelpUrl,
        });
        prisma.reviewRequest.count.mockResolvedValue(0);
        prisma.reviewRequest.findUnique.mockResolvedValue(null);
        prisma.reviewRequest.create.mockResolvedValue(mockCreatedReviewRequest);
        mockQueue.add.mockResolvedValue({});

        await service.handleNpsScore({ ...basePayload, score: 9 });

        expect(mockQueue.add).toHaveBeenCalledWith(
          'send-review-request',
          expect.objectContaining({
            platform: 'Yelp',
            reviewUrl: yelpUrl,
          }),
          expect.any(Object),
        );
      });

      it('should use Facebook URL when Google and Yelp are not configured', async () => {
        const fbUrl = 'https://facebook.com/test-business/reviews';
        prisma.tenantSettings.findUnique.mockResolvedValue({
          ...mockSettings,
          googleReviewUrl: null,
          yelpReviewUrl: null,
          facebookReviewUrl: fbUrl,
        });
        prisma.reviewRequest.count.mockResolvedValue(0);
        prisma.reviewRequest.findUnique.mockResolvedValue(null);
        prisma.reviewRequest.create.mockResolvedValue(mockCreatedReviewRequest);
        mockQueue.add.mockResolvedValue({});

        await service.handleNpsScore({ ...basePayload, score: 9 });

        expect(mockQueue.add).toHaveBeenCalledWith(
          'send-review-request',
          expect.objectContaining({
            platform: 'Facebook',
            reviewUrl: fbUrl,
          }),
          expect.any(Object),
        );
      });
    });
  });

  describe('calculateDelay', () => {
    it('should return base delay in milliseconds during normal business hours', () => {
      const baseHours = 3;
      const expectedMs = 3 * 60 * 60 * 1000; // 10,800,000 ms

      // Mock Date to be 10 AM, so 10 + 3 = 1 PM (within business hours)
      const normalHoursDate = new Date('2025-01-15T15:00:00Z'); // 10 AM ET
      jest.useFakeTimers();
      jest.setSystemTime(normalHoursDate);

      const result = service.calculateDelay(baseHours, 'America/New_York');

      expect(result).toBe(expectedMs);

      jest.useRealTimers();
    });

    it('should push to next morning during quiet hours (8PM-9AM)', () => {
      // Mock Date to be 7 PM ET, so 7 PM + 3 = 10 PM (quiet hours)
      const eveningDate = new Date('2025-01-16T00:00:00Z'); // 7 PM ET
      jest.useFakeTimers();
      jest.setSystemTime(eveningDate);

      const result = service.calculateDelay(3, 'America/New_York');

      // The delay should be longer than 3 hours since it pushes to next morning
      const threeHoursMs = 3 * 60 * 60 * 1000;
      expect(result).toBeGreaterThan(threeHoursMs);
      // Should be at least enough to reach 9 AM next day (at minimum ~14 hours from 7PM)
      expect(result).toBeGreaterThanOrEqual(60000); // at least the minimum 1-minute floor

      jest.useRealTimers();
    });

    it('should handle early morning quiet hours before 9 AM', () => {
      // Mock Date to be 5 AM ET, so 5 AM + 2 = 7 AM (still quiet hours)
      const earlyMorningDate = new Date('2025-01-15T10:00:00Z'); // 5 AM ET
      jest.useFakeTimers();
      jest.setSystemTime(earlyMorningDate);

      const result = service.calculateDelay(2, 'America/New_York');

      const twoHoursMs = 2 * 60 * 60 * 1000;
      expect(result).toBeGreaterThan(twoHoursMs);

      jest.useRealTimers();
    });

    it('should use default timezone fallback for invalid timezone', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T15:00:00Z'));

      // Even with invalid timezone, it should not throw
      const result = service.calculateDelay(3, 'Invalid/Timezone');

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);

      jest.useRealTimers();
    });
  });
});
