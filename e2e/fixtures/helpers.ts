import { Page, Route, Request } from '@playwright/test';
import {
  TEST_SERVICES,
  TEST_CUSTOMERS,
  TEST_TECHNICIANS,
  TEST_APPOINTMENTS,
  TEST_TEAM_MEMBERS,
  TEST_JOBS,
  TEST_DASHBOARD_STATS,
  TEST_TENANT,
  TEST_TIME_SLOTS,
} from './test-data';

const API_URL = 'http://localhost:3001/api/v1';

/**
 * Mock API responses for dashboard data
 */
export async function mockDashboardAPI(page: Page) {
  await page.route(`${API_URL}/reports/dashboard`, async (route) => {
    await route.fulfill({ json: TEST_DASHBOARD_STATS });
  });

  await page.route(`${API_URL}/reports/revenue*`, async (route) => {
    await route.fulfill({
      json: [
        { date: '2026-01-01', revenue: 1500 },
        { date: '2026-01-08', revenue: 2200 },
        { date: '2026-01-15', revenue: 1800 },
        { date: '2026-01-22', revenue: 2500 },
      ],
    });
  });

  await page.route(`${API_URL}/reports/appointments*`, async (route) => {
    await route.fulfill({
      json: [
        { date: '2026-01-01', scheduled: 10, completed: 8, cancelled: 1 },
        { date: '2026-01-08', scheduled: 12, completed: 11, cancelled: 0 },
        { date: '2026-01-15', scheduled: 8, completed: 7, cancelled: 1 },
        { date: '2026-01-22', scheduled: 15, completed: 12, cancelled: 2 },
      ],
    });
  });

  await page.route(`${API_URL}/reports/top-services*`, async (route) => {
    await route.fulfill({
      json: TEST_SERVICES.map((s) => ({ ...s, count: Math.floor(Math.random() * 20) + 5 })),
    });
  });
}

/**
 * Mock API responses for appointments
 */
export async function mockAppointmentsAPI(page: Page) {
  await page.route(`${API_URL}/appointments`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: TEST_APPOINTMENTS });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        json: {
          id: `apt-new-${Date.now()}`,
          ...body,
          status: 'SCHEDULED',
        },
      });
    }
  });

  await page.route(`${API_URL}/appointments/*`, async (route) => {
    if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      const id = route.request().url().split('/').pop();
      await route.fulfill({
        json: { id, ...body },
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { success: true } });
    }
  });

  await page.route(`${API_URL}/customers`, async (route) => {
    await route.fulfill({ json: TEST_CUSTOMERS });
  });

  await page.route(`${API_URL}/services`, async (route) => {
    await route.fulfill({ json: TEST_SERVICES });
  });

  await page.route(`${API_URL}/technicians`, async (route) => {
    await route.fulfill({ json: TEST_TECHNICIANS });
  });
}

/**
 * Mock API responses for team management
 */
export async function mockTeamAPI(page: Page) {
  await page.route(`${API_URL}/team/members`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: TEST_TEAM_MEMBERS });
    }
  });

  await page.route(`${API_URL}/team/members/*`, async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { success: true } });
    } else if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      await route.fulfill({ json: body });
    }
  });

  await page.route(`${API_URL}/team/invitations`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: [] });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        json: {
          id: `inv-${Date.now()}`,
          ...body,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        },
      });
    }
  });
}

/**
 * Mock API responses for jobs
 */
export async function mockJobsAPI(page: Page) {
  await page.route(`${API_URL}/jobs*`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: TEST_JOBS });
    }
  });

  await page.route(`${API_URL}/jobs/*`, async (route) => {
    if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      const id = route.request().url().split('/').pop();
      await route.fulfill({
        json: { id, ...body },
      });
    }
  });
}

/**
 * Mock API responses for settings
 */
export async function mockSettingsAPI(page: Page) {
  const defaultSettings = {
    timezone: 'America/New_York',
    businessHours: [
      { day: 'Monday', enabled: true, startTime: '09:00', endTime: '17:00' },
      { day: 'Tuesday', enabled: true, startTime: '09:00', endTime: '17:00' },
      { day: 'Wednesday', enabled: true, startTime: '09:00', endTime: '17:00' },
      { day: 'Thursday', enabled: true, startTime: '09:00', endTime: '17:00' },
      { day: 'Friday', enabled: true, startTime: '09:00', endTime: '17:00' },
      { day: 'Saturday', enabled: false, startTime: '09:00', endTime: '17:00' },
      { day: 'Sunday', enabled: false, startTime: '09:00', endTime: '17:00' },
    ],
    notifications: {
      sendReminders: true,
      reminderHoursBefore: 24,
      autoConfirmBookings: false,
    },
    reviews: {
      enabled: false,
      hoursAfterCompletion: 24,
      googleUrl: '',
      yelpUrl: '',
    },
  };

  await page.route(`${API_URL}/settings`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: defaultSettings });
    } else if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      await route.fulfill({ json: { ...defaultSettings, ...body } });
    }
  });
}

/**
 * Mock API responses for public booking
 */
export async function mockBookingAPI(page: Page) {
  await page.route(`${API_URL}/booking/tenant/*`, async (route) => {
    await route.fulfill({ json: TEST_TENANT });
  });

  await page.route(`${API_URL}/booking/*/services`, async (route) => {
    await route.fulfill({ json: TEST_SERVICES });
  });

  await page.route(`${API_URL}/booking/*/slots*`, async (route) => {
    await route.fulfill({ json: TEST_TIME_SLOTS });
  });

  await page.route(`${API_URL}/booking/*/book`, async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      json: {
        id: `booking-${Date.now()}`,
        ...body,
        status: 'PENDING',
        confirmationNumber: `CONF-${Date.now().toString(36).toUpperCase()}`,
      },
    });
  });
}

/**
 * Mock authenticated session for Clerk
 * This intercepts Clerk's authentication checks and provides mock user data
 */
export async function mockAuthSession(page: Page) {
  // Intercept Clerk API calls
  await page.route('**/clerk.accounts.dev/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/v1/client')) {
      await route.fulfill({
        json: {
          response: {
            id: 'client_mock_123',
            sessions: [{
              id: 'sess_mock_123',
              status: 'active',
              user: {
                id: 'user_mock_123',
                email_addresses: [{ email_address: 'test@example.com' }],
                first_name: 'Test',
                last_name: 'User',
              },
            }],
            sign_in: null,
            sign_up: null,
          },
        },
      });
    } else {
      await route.fulfill({ json: {} });
    }
  });

  // Mock Clerk session in browser context
  await page.addInitScript(() => {
    (window as any).__clerk_frontend_api = 'mock';
    (window as any).__clerk_session = {
      id: 'sess_mock_123',
      userId: 'user_mock_123',
      status: 'active',
    };

    // Mock Clerk's useAuth hook behavior
    (window as any).__clerk_client = {
      session: {
        id: 'sess_mock_123',
        status: 'active',
        getToken: async () => 'mock-jwt-token',
      },
      user: {
        id: 'user_mock_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User',
      },
    };
  });
}

/**
 * Setup authenticated page with all necessary mocks
 * Use this for testing protected dashboard routes
 */
export async function setupAuthenticatedPage(page: Page) {
  await mockAuthSession(page);

  // Mock the tenant/organization context
  await page.route('**/api/**/tenant', async (route) => {
    await route.fulfill({
      json: {
        id: 'tenant_mock_123',
        name: 'Test Business',
        slug: 'test-business',
      },
    });
  });

  // Mock user profile endpoint
  await page.route('**/api/**/user/profile', async (route) => {
    await route.fulfill({
      json: {
        id: 'user_mock_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'OWNER',
        tenantId: 'tenant_mock_123',
      },
    });
  });
}

/**
 * Wait for loading to complete
 */
export async function waitForLoading(page: Page) {
  // Wait for any loading spinners to disappear
  await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
}

/**
 * Capture console errors during tests
 */
export function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  return errors;
}
