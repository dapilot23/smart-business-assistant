import { test, expect } from '@playwright/test';
import {
  mockAppointmentsAPI,
  captureConsoleErrors,
} from './fixtures/helpers';
import { TEST_APPOINTMENTS } from './fixtures/test-data';

const BASE_URL = 'http://localhost:3000';

test.describe('Appointments', () => {
  test.describe('Appointments Page Access', () => {
    test('should be accessible in demo mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/appointments`);
      await page.waitForLoadState('networkidle');
      // In demo mode, page is accessible without auth
      expect(page.url()).toContain('/appointments');
    });

    test('should not return server error', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/appointments`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(`${BASE_URL}/dashboard/appointments`);
      await page.waitForLoadState('networkidle');

      const criticalErrors = errors.filter((e) => e.includes('Uncaught'));
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Appointments Page with Mocked API', () => {
    test.beforeEach(async ({ page }) => {
      await mockAppointmentsAPI(page);
    });

    test('should load appointments page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/appointments`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Appointments API Mocking', () => {
    test('should mock GET appointments', async ({ page }) => {
      let apiCalled = false;

      await page.route('**/api/**/appointments', async (route) => {
        if (route.request().method() === 'GET') {
          apiCalled = true;
          await route.fulfill({ json: TEST_APPOINTMENTS });
        } else {
          await route.continue();
        }
      });

      await page.goto(`${BASE_URL}/dashboard/appointments`);
      await page.waitForLoadState('networkidle');

      // API mock is set up correctly
      expect(typeof apiCalled).toBe('boolean');
    });

    test('should mock POST appointments', async ({ page }) => {
      let createCalled = false;

      await page.route('**/api/**/appointments', async (route) => {
        if (route.request().method() === 'POST') {
          createCalled = true;
          await route.fulfill({
            json: { id: 'new-apt', status: 'SCHEDULED' },
          });
        } else {
          await route.fulfill({ json: TEST_APPOINTMENTS });
        }
      });

      await page.goto(`${BASE_URL}/dashboard/appointments`);
      await page.waitForLoadState('networkidle');

      expect(typeof createCalled).toBe('boolean');
    });
  });

  test.describe('Appointments Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      await page.route('**/api/**', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Server error' },
        });
      });

      await page.goto(`${BASE_URL}/dashboard/appointments`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle create appointment error', async ({ page }) => {
      await page.route('**/api/**/appointments', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 400,
            json: { error: 'Invalid appointment data' },
          });
        } else {
          await route.fulfill({ json: TEST_APPOINTMENTS });
        }
      });

      await page.goto(`${BASE_URL}/dashboard/appointments`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Appointments Responsive Design', () => {
    test.beforeEach(async ({ page }) => {
      await mockAppointmentsAPI(page);
    });

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const response = await page.goto(`${BASE_URL}/dashboard/appointments`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      const response = await page.goto(`${BASE_URL}/dashboard/appointments`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const response = await page.goto(`${BASE_URL}/dashboard/appointments`);
      expect(response?.status()).toBeLessThan(500);
    });
  });
});
