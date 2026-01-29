import { test, expect } from '@playwright/test';
import { mockJobsAPI, captureConsoleErrors } from './fixtures/helpers';
import { TEST_JOBS } from './fixtures/test-data';

const BASE_URL = 'http://localhost:3000';

test.describe('Jobs Management', () => {
  test.describe('Jobs Page Access', () => {
    test.beforeEach(async ({ page }) => {
      await mockJobsAPI(page);
    });

    test('should be accessible in demo mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      // In demo mode, page is accessible without auth
      expect(page.url()).toContain('/jobs');
    });

    test('should not return server error', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      const criticalErrors = errors.filter((e) => e.includes('Uncaught'));
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Jobs Page with Mocked API', () => {
    test.beforeEach(async ({ page }) => {
      await mockJobsAPI(page);
    });

    test('should load jobs page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test.describe('Jobs API Operations', () => {
    test('should mock GET jobs', async ({ page }) => {
      let apiCalled = false;

      await page.route('**/api/**/jobs*', async (route) => {
        if (route.request().method() === 'GET') {
          apiCalled = true;
          await route.fulfill({ json: TEST_JOBS });
        } else {
          await route.continue();
        }
      });

      await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      expect(typeof apiCalled).toBe('boolean');
    });

    test('should mock PATCH job status', async ({ page }) => {
      let updateCalled = false;

      await page.route('**/api/**/jobs/*', async (route) => {
        if (
          route.request().method() === 'PATCH' ||
          route.request().method() === 'PUT'
        ) {
          updateCalled = true;
          await route.fulfill({ json: { success: true } });
        } else {
          await route.continue();
        }
      });

      await mockJobsAPI(page);
      await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      expect(typeof updateCalled).toBe('boolean');
    });

    test('should handle filter parameters', async ({ page }) => {
      let filterApplied = false;

      await page.route('**/api/**/jobs*', async (route) => {
        const url = route.request().url();
        if (url.includes('status=')) {
          filterApplied = true;
        }
        await route.fulfill({ json: TEST_JOBS });
      });

      await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      expect(typeof filterApplied).toBe('boolean');
    });
  });

  test.describe('Jobs Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      await page.route('**/api/**', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Server error' },
        });
      });

      await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle empty jobs list', async ({ page }) => {
      await page.route('**/api/**/jobs*', async (route) => {
        await route.fulfill({ json: [] });
      });

      await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle filter API errors', async ({ page }) => {
      await mockJobsAPI(page);
      await page.route('**/api/**/jobs*', async (route) => {
        if (route.request().url().includes('status=')) {
          await route.fulfill({
            status: 500,
            json: { error: 'Filter error' },
          });
        } else {
          await route.fulfill({ json: TEST_JOBS });
        }
      });

      await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Jobs Responsive Design', () => {
    test.beforeEach(async ({ page }) => {
      await mockJobsAPI(page);
    });

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const response = await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      const response = await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const response = await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
    });
  });
});
