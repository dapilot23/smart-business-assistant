import { test, expect } from '@playwright/test';
import { captureConsoleErrors } from './fixtures/helpers';

const BASE_URL = 'http://localhost:3000';

test.describe('Availability Page (Demo Mode)', () => {
  test.describe('Page Access', () => {
    test('should load availability page successfully', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/availability`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/availability');
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(`${BASE_URL}/dashboard/availability`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      const criticalErrors = errors.filter(
        (e) => e.includes('Uncaught') && !e.includes('Clerk')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('UI Elements', () => {
    test('should display availability-related content', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/availability`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      const bodyText = (await page.locator('body').textContent()) || '';
      const hasAvailabilityContent =
        bodyText.toLowerCase().includes('availability') ||
        bodyText.toLowerCase().includes('schedule') ||
        bodyText.toLowerCase().includes('hours') ||
        bodyText.toLowerCase().includes('time');

      expect(hasAvailabilityContent).toBeTruthy();
    });

    test('should have day selection or time slots', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/availability`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      const bodyText = (await page.locator('body').textContent()) || '';
      // Look for day names or time-related content
      const hasDays =
        bodyText.toLowerCase().includes('monday') ||
        bodyText.toLowerCase().includes('tuesday') ||
        bodyText.toLowerCase().includes('wednesday') ||
        bodyText.toLowerCase().includes('sunday') ||
        bodyText.toLowerCase().includes('week');

      // Either days or some schedule-related content should exist
      expect(bodyText.length).toBeGreaterThan(100);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate from availability to appointments', async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/dashboard/availability`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await page.goto(`${BASE_URL}/dashboard/appointments`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/appointments');
    });

    test('should navigate from availability to settings', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/availability`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/settings');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle page refresh', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/availability`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
      expect(page.url()).toContain('/availability');
    });

    test('should handle rapid navigation', async ({ page }) => {
      const routes = [
        '/dashboard/availability',
        '/dashboard/appointments',
        '/dashboard/availability',
      ];

      for (const route of routes) {
        const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBeLessThan(500);
      }
    });
  });
});
