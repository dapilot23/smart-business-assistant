import { test, expect } from '@playwright/test';
import { captureConsoleErrors } from './fixtures/helpers';

const BASE_URL = 'http://localhost:3000';

// Demo mode tests - when NEXT_PUBLIC_DEMO_MODE=true, auth is bypassed
test.describe('Authentication (Demo Mode)', () => {
  test.describe('Login Page', () => {
    test('should load login page successfully', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/login`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(500);
    });

    test('should display demo login UI elements', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      const bodyText = (await page.locator('body').textContent()) || '';
      // In demo mode, should show demo login form
      const hasDemoUI =
        bodyText.toLowerCase().includes('demo') ||
        bodyText.toLowerCase().includes('dashboard') ||
        bodyText.toLowerCase().includes('login') ||
        bodyText.toLowerCase().includes('sign');

      expect(hasDemoUI).toBeTruthy();
    });

    test('should have proper page structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('should not have console errors on load', async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      const criticalErrors = errors.filter(
        (e) => e.includes('Uncaught') && !e.includes('Clerk')
      );
      expect(criticalErrors.length).toBe(0);
    });

    test('should have link to dashboard in demo mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // In demo mode, there should be a link to dashboard
      const dashboardLink = page.locator('a[href="/dashboard"]');
      await expect(dashboardLink).toBeVisible();
    });
  });

  test.describe('Signup Page', () => {
    test('should load signup page successfully', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/signup`);
      expect(response?.status()).toBe(200);
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(500);
    });

    test('should display demo signup UI elements', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      await page.waitForLoadState('networkidle');

      const bodyText = (await page.locator('body').textContent()) || '';
      const hasDemoUI =
        bodyText.toLowerCase().includes('demo') ||
        bodyText.toLowerCase().includes('dashboard') ||
        bodyText.toLowerCase().includes('signup') ||
        bodyText.toLowerCase().includes('sign');

      expect(hasDemoUI).toBeTruthy();
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      await page.waitForLoadState('networkidle');

      const loginLink = page.locator('a[href="/login"]');
      await expect(loginLink).toBeVisible();
    });
  });

  test.describe('Dashboard Access (Demo Mode - No Auth Required)', () => {
    test('dashboard should be accessible in demo mode', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
      // In demo mode, we stay on dashboard (no redirect to login)
      expect(page.url()).toContain('/dashboard');
    });

    test('appointments page should be accessible', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/appointments`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/appointments');
    });

    test('team page should be accessible', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/team`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/team');
    });

    test('settings page should be accessible', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/settings`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/settings');
    });

    test('jobs page should be accessible', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/jobs`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/jobs');
    });

    test('quotes page should be accessible', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/quotes`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('invoices page should be accessible', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/invoices`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('availability page should be accessible', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/availability`);
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe('Public Routes - No Auth Required', () => {
    test('landing page should be accessible without auth', async ({ page }) => {
      const response = await page.goto(BASE_URL);
      expect(response?.status()).toBe(200);
      await expect(page.locator('body')).toBeVisible();
    });

    test('onboarding page should be accessible', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/onboarding`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('public booking page should be accessible without auth', async ({
      page,
    }) => {
      const response = await page.goto(`${BASE_URL}/book/test-business`);
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle invalid routes gracefully', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/invalid-route-12345`);
      const status = response?.status() || 0;
      expect(status).toBeLessThan(500);
    });

    test('should navigate between dashboard pages in demo mode', async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/dashboard');

      await page.goto(`${BASE_URL}/dashboard/settings`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/settings');
    });

    test('should handle rapid navigation between pages', async ({ page }) => {
      const routes = [
        '/dashboard',
        '/dashboard/appointments',
        '/dashboard/team',
      ];

      for (const route of routes) {
        const response = await page.goto(`${BASE_URL}${route}`);
        expect(response?.status()).toBeLessThan(500);
      }
    });
  });

  test.describe('Demo Mode Login Flow', () => {
    test('should have dashboard link on login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Verify the dashboard link exists
      const dashboardLink = page.locator('a[href="/dashboard"]');
      await expect(dashboardLink).toBeVisible();

      // Navigate by clicking and waiting for URL change
      await Promise.all([
        page.waitForURL('**/dashboard'),
        dashboardLink.click(),
      ]);

      expect(page.url()).toContain('/dashboard');
    });

    test('should have dashboard link on signup page', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      await page.waitForLoadState('networkidle');

      // Verify the dashboard link exists
      const dashboardLink = page.locator('a[href="/dashboard"]');
      await expect(dashboardLink).toBeVisible();

      // Navigate by clicking and waiting for URL change
      await Promise.all([
        page.waitForURL('**/dashboard'),
        dashboardLink.click(),
      ]);

      expect(page.url()).toContain('/dashboard');
    });
  });
});
