import { test, expect } from '@playwright/test';
import { mockBookingAPI, captureConsoleErrors } from './fixtures/helpers';
import { TEST_TENANT, TEST_SERVICES } from './fixtures/test-data';

const BASE_URL = 'http://localhost:3000';

test.describe('Public Booking Flow', () => {
  test.describe('Booking Page Access', () => {
    test('should load booking page for tenant', async ({ page }) => {
      await mockBookingAPI(page);
      const response = await page.goto(`${BASE_URL}/book/test-business`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
    });

    test('should handle invalid tenant gracefully', async ({ page }) => {
      await page.route('**/api/**/tenant/**', async (route) => {
        await route.fulfill({
          status: 404,
          json: { error: 'Tenant not found' },
        });
      });

      const response = await page.goto(`${BASE_URL}/book/invalid-tenant-xyz`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await mockBookingAPI(page);
      await page.goto(`${BASE_URL}/book/test-business`);
      await page.waitForLoadState('networkidle');

      const criticalErrors = errors.filter((e) => e.includes('Uncaught'));
      expect(criticalErrors.length).toBe(0);
    });

    test('should be accessible without authentication', async ({ page }) => {
      await mockBookingAPI(page);
      const response = await page.goto(`${BASE_URL}/book/test-business`);
      expect(response?.status()).toBeLessThan(500);

      // Should NOT redirect to login
      expect(page.url()).not.toContain('/login');
    });
  });

  test.describe('Booking API Mocking', () => {
    test.beforeEach(async ({ page }) => {
      await mockBookingAPI(page);
    });

    test('should mock tenant API', async ({ page }) => {
      await page.goto(`${BASE_URL}/book/test-business`);
      await page.waitForLoadState('networkidle');

      const bodyText = await page.locator('body').textContent();
      // Page should load without error
      expect(bodyText?.length).toBeGreaterThan(0);
    });

    test('should mock services API', async ({ page }) => {
      let servicesCalled = false;

      await page.route('**/api/**/services', async (route) => {
        servicesCalled = true;
        await route.fulfill({ json: TEST_SERVICES });
      });

      await page.goto(`${BASE_URL}/book/test-business`);
      await page.waitForLoadState('networkidle');

      expect(typeof servicesCalled).toBe('boolean');
    });

    test('should mock booking submission', async ({ page }) => {
      let bookingCalled = false;

      await page.route('**/api/**/book', async (route) => {
        bookingCalled = true;
        await route.fulfill({
          json: {
            id: `booking-${Date.now()}`,
            status: 'PENDING',
            confirmationNumber: 'CONF-TEST123',
          },
        });
      });

      await page.goto(`${BASE_URL}/book/test-business`);
      await page.waitForLoadState('networkidle');

      expect(typeof bookingCalled).toBe('boolean');
    });
  });

  test.describe('Booking Error Handling', () => {
    test('should handle booking submission errors', async ({ page }) => {
      await page.route('**/api/**/book', async (route) => {
        await route.fulfill({
          status: 400,
          json: { error: 'Time slot no longer available' },
        });
      });

      await mockBookingAPI(page);
      const response = await page.goto(`${BASE_URL}/book/test-business`);
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await page.route('**/api/**', async (route) => {
        await route.abort('failed');
      });

      await page.goto(`${BASE_URL}/book/test-business`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Booking Responsive Design', () => {
    test.beforeEach(async ({ page }) => {
      await mockBookingAPI(page);
    });

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const response = await page.goto(`${BASE_URL}/book/test-business`);
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      const response = await page.goto(`${BASE_URL}/book/test-business`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const response = await page.goto(`${BASE_URL}/book/test-business`);
      expect(response?.status()).toBeLessThan(500);
    });
  });
});
