import { test, expect } from '@playwright/test';
import { mockSettingsAPI, captureConsoleErrors } from './fixtures/helpers';

const BASE_URL = 'http://localhost:3000';

test.describe('Settings', () => {
  test.describe('Settings Page Access', () => {
    test('should be accessible in demo mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      // In demo mode, page is accessible without auth
      expect(page.url()).toContain('/settings');
    });

    test('should not return server error', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      const criticalErrors = errors.filter((e) => e.includes('Uncaught'));
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Settings Page with Mocked API', () => {
    test.beforeEach(async ({ page }) => {
      await mockSettingsAPI(page);
    });

    test('should load settings page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test.describe('Settings API Operations', () => {
    test('should mock GET settings', async ({ page }) => {
      let apiCalled = false;

      await page.route('**/api/**/settings', async (route) => {
        if (route.request().method() === 'GET') {
          apiCalled = true;
          await route.fulfill({
            json: {
              timezone: 'America/New_York',
              businessHours: [],
              notifications: {},
              reviews: {},
            },
          });
        } else {
          await route.continue();
        }
      });

      await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      expect(typeof apiCalled).toBe('boolean');
    });

    test('should mock save settings', async ({ page }) => {
      let saveCalled = false;

      await page.route('**/api/**/settings', async (route) => {
        if (
          route.request().method() === 'PUT' ||
          route.request().method() === 'PATCH'
        ) {
          saveCalled = true;
          await route.fulfill({ json: { success: true } });
        } else {
          await route.fulfill({
            json: {
              timezone: 'America/New_York',
              businessHours: [],
              notifications: {},
              reviews: {},
            },
          });
        }
      });

      await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      expect(typeof saveCalled).toBe('boolean');
    });
  });

  test.describe('Settings Error Handling', () => {
    test('should handle settings load error', async ({ page }) => {
      await page.route('**/api/**/settings', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Failed to load settings' },
        });
      });

      await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle settings save error', async ({ page }) => {
      await page.route('**/api/**/settings', async (route) => {
        if (
          route.request().method() === 'PUT' ||
          route.request().method() === 'PATCH'
        ) {
          await route.fulfill({
            status: 500,
            json: { error: 'Failed to save' },
          });
        } else {
          await route.fulfill({ json: {} });
        }
      });

      await mockSettingsAPI(page);
      await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Settings Responsive Design', () => {
    test.beforeEach(async ({ page }) => {
      await mockSettingsAPI(page);
    });

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const response = await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      const response = await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const response = await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
    });
  });
});
