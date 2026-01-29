import { test, expect } from '@playwright/test';
import { captureConsoleErrors } from './fixtures/helpers';

const BASE_URL = 'http://localhost:3000';

test.describe('SMS Page (Demo Mode)', () => {
  test.describe('Page Access', () => {
    test('should load SMS page successfully', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/sms`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/sms');
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(`${BASE_URL}/dashboard/sms`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      const criticalErrors = errors.filter(
        (e) => e.includes('Uncaught') && !e.includes('Clerk')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('UI Elements', () => {
    test('should display SMS-related content', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/sms`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      const bodyText = (await page.locator('body').textContent()) || '';
      const hasSMSContent =
        bodyText.toLowerCase().includes('sms') ||
        bodyText.toLowerCase().includes('message') ||
        bodyText.toLowerCase().includes('text') ||
        bodyText.toLowerCase().includes('twilio');

      expect(hasSMSContent).toBeTruthy();
    });

    test('should have proper page structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/sms`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between SMS and other dashboard pages', async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/dashboard/sms`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/settings');

      await page.goto(`${BASE_URL}/dashboard/sms`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/sms');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle page without Twilio configuration', async ({
      page,
    }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/sms`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle rapid navigation', async ({ page }) => {
      const routes = ['/dashboard/sms', '/dashboard', '/dashboard/sms'];

      for (const route of routes) {
        const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBeLessThan(500);
      }
    });
  });
});
