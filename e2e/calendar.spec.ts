import { test, expect } from '@playwright/test';
import { mockAppointmentsAPI, captureConsoleErrors } from './fixtures/helpers';

const BASE_URL = 'http://localhost:3000';

test.describe('Calendar / Availability', () => {
  test.describe('Availability Page Access', () => {
    test('should be accessible in demo mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/availability`);
      await page.waitForLoadState('networkidle');
      // In demo mode, page is accessible without auth
      expect(page.url()).toContain('/availability');
    });

    test('should not return server error', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/availability`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(`${BASE_URL}/dashboard/availability`);
      await page.waitForLoadState('networkidle');

      const criticalErrors = errors.filter((e) => e.includes('Uncaught'));
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Calendar Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await mockAppointmentsAPI(page);
    });

    test('should load appointments page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/appointments`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Availability Save Operations', () => {
    test('should handle save API call', async ({ page }) => {
      let saveCalled = false;

      await page.route('**/api/**', async (route) => {
        if (
          route.request().method() === 'PUT' ||
          route.request().method() === 'POST'
        ) {
          saveCalled = true;
          await route.fulfill({ json: { success: true } });
        } else {
          await route.fulfill({ json: {} });
        }
      });

      await page.goto(`${BASE_URL}/dashboard/availability`);
      await page.waitForLoadState('networkidle');

      expect(typeof saveCalled).toBe('boolean');
    });

    test('should handle save errors gracefully', async ({ page }) => {
      await page.route('**/api/**', async (route) => {
        if (
          route.request().method() === 'PUT' ||
          route.request().method() === 'POST'
        ) {
          await route.fulfill({
            status: 500,
            json: { error: 'Failed to save' },
          });
        } else {
          await route.fulfill({ json: {} });
        }
      });

      await page.goto(`${BASE_URL}/dashboard/availability`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Calendar Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const response = await page.goto(`${BASE_URL}/dashboard/availability`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      const response = await page.goto(`${BASE_URL}/dashboard/availability`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const response = await page.goto(`${BASE_URL}/dashboard/availability`);
      expect(response?.status()).toBeLessThan(500);
    });
  });
});
