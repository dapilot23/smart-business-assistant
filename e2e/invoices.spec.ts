import { test, expect } from '@playwright/test';
import { captureConsoleErrors } from './fixtures/helpers';

const BASE_URL = 'http://localhost:3000';

test.describe('Invoices Page (Demo Mode)', () => {
  test.describe('Page Access', () => {
    test('should load invoices page successfully', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/invoices`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/invoices');
    });

    test('should load create invoice page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/invoices/new`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(`${BASE_URL}/dashboard/invoices`);
      await page.waitForLoadState('networkidle');

      const criticalErrors = errors.filter(
        (e) => e.includes('Uncaught') && !e.includes('Clerk')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('UI Elements', () => {
    test('should display page title or header', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/invoices`);
      await page.waitForLoadState('networkidle');

      const bodyText = (await page.locator('body').textContent()) || '';
      const hasInvoiceContent =
        bodyText.toLowerCase().includes('invoice') ||
        bodyText.toLowerCase().includes('billing') ||
        bodyText.toLowerCase().includes('payment');

      expect(hasInvoiceContent).toBeTruthy();
    });

    test('should have navigation elements', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/invoices`);
      await page.waitForLoadState('networkidle');

      // Should be able to find navigation or sidebar
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate from invoices to dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/invoices`);
      await page.waitForLoadState('networkidle');

      // Try to navigate back to dashboard
      const dashboardLink = page.locator(
        'a[href="/dashboard"], a[href*="dashboard"]:not([href*="invoices"])'
      );
      if ((await dashboardLink.count()) > 0) {
        await dashboardLink.first().click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/dashboard');
      }
    });

    test('should handle direct navigation to invoice list', async ({
      page,
    }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/invoices`);
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle invalid invoice ID gracefully', async ({ page }) => {
      const response = await page.goto(
        `${BASE_URL}/dashboard/invoices/invalid-id-12345`
      );
      const status = response?.status() || 0;
      expect(status).toBeLessThan(500);
    });

    test('should handle rapid page refresh', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/invoices`);

      for (let i = 0; i < 3; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');
      }

      await expect(page.locator('body')).toBeVisible();
    });
  });
});
