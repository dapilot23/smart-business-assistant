// Mock uuid to avoid ES module issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
  validate: jest.fn(() => true),
}));
