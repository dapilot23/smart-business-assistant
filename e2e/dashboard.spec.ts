import { test, expect } from '@playwright/test';
import { mockDashboardAPI, captureConsoleErrors } from './fixtures/helpers';

const BASE_URL = 'http://localhost:3000';

test.describe('Dashboard', () => {
  test.describe('Landing Page', () => {
    test('should load landing page with 200 status', async ({ page }) => {
      const response = await page.goto(BASE_URL);
      expect(response?.status()).toBe(200);
      await expect(page.locator('body')).toBeVisible();
    });

    test('should contain business-related content', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.toLowerCase()).toContain('business');
    });

    test('should have login navigation link', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const loginLink = page.locator('a[href="/login"]');
      expect(await loginLink.count()).toBeGreaterThan(0);
    });

    test('should display pricing information', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const bodyText = (await page.locator('body').textContent()) || '';
      const hasPricing =
        /\$\d+/.test(bodyText) ||
        bodyText.toLowerCase().includes('pricing') ||
        bodyText.toLowerCase().includes('plan');

      expect(hasPricing).toBeTruthy();
    });

    test('should not have server errors', async ({ page }) => {
      const response = await page.goto(BASE_URL);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const criticalErrors = errors.filter((e) => e.includes('Uncaught'));
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Dashboard Page Access', () => {
    test('should be accessible in demo mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      // In demo mode, page is accessible without auth
      expect(page.url()).toContain('/dashboard');
    });

    test('should not return 500 error', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard`);
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe('Dashboard with Mocked API', () => {
    test.beforeEach(async ({ page }) => {
      await mockDashboardAPI(page);
    });

    test('should load dashboard page structure', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Dashboard Responsive Design', () => {
    test('should handle desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const response = await page.goto(`${BASE_URL}/dashboard`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should handle mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const response = await page.goto(`${BASE_URL}/dashboard`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should handle tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      const response = await page.goto(`${BASE_URL}/dashboard`);
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe('Dashboard Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      await page.route('**/api/**', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Internal Server Error' },
        });
      });

      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });
});
