import { PrismaService } from '../config/prisma/prisma.service';

export type MockPrismaService = {
  [K in keyof PrismaService]: K extends `$${string}`
    ? jest.Mock
    : {
        findMany: jest.Mock;
        findFirst: jest.Mock;
        findUnique: jest.Mock;
        create: jest.Mock;
        createMany: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
        deleteMany: jest.Mock;
        count: jest.Mock;
        aggregate: jest.Mock;
        upsert: jest.Mock;
        updateMany: jest.Mock;
        groupBy: jest.Mock;
      };
};

export function createMockPrismaService(): MockPrismaService {
  const createModelMock = () => ({
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
    groupBy: jest.fn(),
  });

  return {
    customer: createModelMock(),
    communicationOptOut: createModelMock(),
    appointment: createModelMock(),
    invoice: createModelMock(),
    invoiceItem: createModelMock(),
    quote: createModelMock(),
    quoteItem: createModelMock(),
    quoteFollowUp: createModelMock(),
    job: createModelMock(),
    jobPhoto: createModelMock(),
    service: createModelMock(),
    user: createModelMock(),
    tenant: createModelMock(),
    tenantSettings: createModelMock(),
    reviewRequest: createModelMock(),
    npsSurvey: createModelMock(),
    paymentReminder: createModelMock(),
    appointmentReminder: createModelMock(),
    waitlist: createModelMock(),
    aiUsageLog: createModelMock(),
    aiFeedback: createModelMock(),
    retentionCampaign: createModelMock(),
    serviceInterval: createModelMock(),
    technicianSkill: createModelMock(),
    technicianAvailability: createModelMock(),
    maintenanceAlert: createModelMock(),
    messageClassification: createModelMock(),
    suggestedResponse: createModelMock(),
    autoResponderRule: createModelMock(),
    conversationThread: createModelMock(),
    message: createModelMock(),
    copilotConversation: createModelMock(),
    weeklyReport: createModelMock(),
    businessAnomaly: createModelMock(),
    agentTask: createModelMock(),
    taskLedgerEntry: createModelMock(),
    $transaction: jest.fn((cb) => cb(createMockPrismaService())),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    setTenantContext: jest.fn(),
    clearTenantContext: jest.fn(),
    withTenantContext: jest.fn((_tenantId, callback) => callback()),
    withSystemContext: jest.fn((callback) => callback()),
  } as any;
}
