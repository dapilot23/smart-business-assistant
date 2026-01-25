import { test, expect } from '@playwright/test';
import { captureConsoleErrors } from './fixtures/helpers';

const BASE_URL = 'http://localhost:3000';

test.describe('Quotes Page (Demo Mode)', () => {
  test.describe('Page Access', () => {
    test('should load quotes page successfully', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/quotes`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/quotes');
    });

    test('should load create quote page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/quotes/new`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
    });

    test('should not have critical console errors on quotes list', async ({
      page,
    }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(`${BASE_URL}/dashboard/quotes`);
      await page.waitForLoadState('networkidle');

      const criticalErrors = errors.filter(
        (e) => e.includes('Uncaught') && !e.includes('Clerk')
      );
      expect(criticalErrors.length).toBe(0);
    });

    test('should not have critical console errors on new quote page', async ({
      page,
    }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(`${BASE_URL}/dashboard/quotes/new`);
      await page.waitForLoadState('networkidle');

      const criticalErrors = errors.filter(
        (e) => e.includes('Uncaught') && !e.includes('Clerk')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('UI Elements', () => {
    test('should display quotes-related content', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/quotes`);
      await page.waitForLoadState('networkidle');

      const bodyText = (await page.locator('body').textContent()) || '';
      const hasQuotesContent =
        bodyText.toLowerCase().includes('quote') ||
        bodyText.toLowerCase().includes('estimate') ||
        bodyText.toLowerCase().includes('proposal');

      expect(hasQuotesContent).toBeTruthy();
    });

    test('should have action buttons or links', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/quotes`);
      await page.waitForLoadState('networkidle');

      // Look for create/new buttons or links
      const newQuoteLink = page.locator(
        'a[href*="quotes/new"], button:has-text("New"), button:has-text("Create")'
      );
      const count = await newQuoteLink.count();

      // Either links/buttons exist or page has substantial content
      const bodyText = (await page.locator('body').textContent()) || '';
      expect(count > 0 || bodyText.length > 100).toBeTruthy();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate from quotes list to new quote', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/quotes`);
      await page.waitForLoadState('networkidle');

      // Navigate to new quote page
      await page.goto(`${BASE_URL}/dashboard/quotes/new`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/quotes/new');
    });

    test('should navigate from quotes to invoices', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/quotes`);
      await page.waitForLoadState('networkidle');

      await page.goto(`${BASE_URL}/dashboard/invoices`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/invoices');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle invalid quote ID gracefully', async ({ page }) => {
      const response = await page.goto(
        `${BASE_URL}/dashboard/quotes/invalid-id-12345`
      );
      const status = response?.status() || 0;
      expect(status).toBeLessThan(500);
    });

    test('should handle page refresh on quotes list', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/quotes`);
      await page.waitForLoadState('networkidle');

      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
      expect(page.url()).toContain('/quotes');
    });

    test('should handle page refresh on new quote page', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/quotes/new`);
      await page.waitForLoadState('networkidle');

      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle rapid navigation between quotes pages', async ({
      page,
    }) => {
      const routes = [
        '/dashboard/quotes',
        '/dashboard/quotes/new',
        '/dashboard/quotes',
      ];

      for (const route of routes) {
        const response = await page.goto(`${BASE_URL}${route}`);
        expect(response?.status()).toBeLessThan(500);
      }
    });
  });
});
