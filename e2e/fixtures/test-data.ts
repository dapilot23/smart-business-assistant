// Test data for E2E tests

export const TEST_TENANT = {
  id: 'tenant-test-123',
  name: 'Test Business',
  slug: 'test-business',
};

export const TEST_USER = {
  email: 'test@example.com',
  name: 'Test User',
};

export const TEST_SERVICES = [
  {
    id: 'service-1',
    name: 'General Consultation',
    description: 'Initial consultation and assessment',
    duration: 30,
    price: 50,
  },
  {
    id: 'service-2',
    name: 'Full Service',
    description: 'Complete service package',
    duration: 60,
    price: 150,
  },
  {
    id: 'service-3',
    name: 'Premium Service',
    description: 'Premium offering with extras',
    duration: 90,
    price: 250,
  },
];

export const TEST_CUSTOMERS = [
  {
    id: 'customer-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  },
  {
    id: 'customer-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1234567891',
  },
];

export const TEST_TECHNICIANS = [
  {
    id: 'tech-1',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    role: 'Technician',
  },
  {
    id: 'tech-2',
    name: 'Sarah Wilson',
    email: 'sarah@example.com',
    role: 'Senior Technician',
  },
];

export const TEST_APPOINTMENTS = [
  {
    id: 'apt-1',
    customerId: 'customer-1',
    serviceId: 'service-1',
    technicianId: 'tech-1',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'SCHEDULED',
    customer: { name: 'John Doe', phone: '+1234567890' },
    service: { name: 'General Consultation', duration: 30 },
    technician: { name: 'Mike Johnson' },
  },
  {
    id: 'apt-2',
    customerId: 'customer-2',
    serviceId: 'service-2',
    technicianId: 'tech-2',
    scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    status: 'CONFIRMED',
    customer: { name: 'Jane Smith', phone: '+1234567891' },
    service: { name: 'Full Service', duration: 60 },
    technician: { name: 'Sarah Wilson' },
  },
];

export const TEST_TEAM_MEMBERS = [
  {
    id: 'member-1',
    name: 'Owner User',
    email: 'owner@example.com',
    role: 'OWNER',
    status: 'ACTIVE',
  },
  {
    id: 'member-2',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
  },
  {
    id: 'member-3',
    name: 'Dispatcher User',
    email: 'dispatcher@example.com',
    role: 'DISPATCHER',
    status: 'ACTIVE',
  },
];

export const TEST_JOBS = [
  {
    id: 'job-1',
    appointmentId: 'apt-1',
    status: 'NOT_STARTED',
    notes: 'Initial job notes',
    customer: { name: 'John Doe', address: '123 Main St' },
    service: { name: 'General Consultation' },
    technician: { name: 'Mike Johnson' },
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'job-2',
    appointmentId: 'apt-2',
    status: 'IN_PROGRESS',
    notes: 'Currently working on this',
    customer: { name: 'Jane Smith', address: '456 Oak Ave' },
    service: { name: 'Full Service' },
    technician: { name: 'Sarah Wilson' },
    scheduledAt: new Date().toISOString(),
  },
];

export const TEST_TIME_SLOTS = [
  { time: '09:00', available: true },
  { time: '09:30', available: true },
  { time: '10:00', available: false },
  { time: '10:30', available: true },
  { time: '11:00', available: true },
  { time: '11:30', available: true },
  { time: '14:00', available: true },
  { time: '14:30', available: true },
  { time: '15:00', available: true },
];

export const TEST_DASHBOARD_STATS = {
  revenue: { current: 12500, change: 15.5 },
  appointments: { current: 45, change: 8.2 },
  customers: { active: 120 },
  calls: { handled: 89 },
  quotes: { pending: 12 },
  jobs: { inProgress: 5 },
};
