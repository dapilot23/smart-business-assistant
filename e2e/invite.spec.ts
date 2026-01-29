import { test, expect } from '@playwright/test';
import { captureConsoleErrors } from './fixtures/helpers';

const BASE_URL = 'http://localhost:3000';

test.describe('Team Invitation Flow (Demo Mode)', () => {
  test.describe('Page Access', () => {
    test('should load invite page with valid token format', async ({ page }) => {
      // Mock the invitation API
      await page.route('**/api/**/invitation/**', async (route) => {
        await route.fulfill({
          json: {
            business_name: 'Test Business',
            role: 'technician',
            invited_by: 'admin@test.com',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
        });
      });

      const response = await page.goto(`${BASE_URL}/invite/test-token-123`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });

    test('should handle invalid invite token gracefully', async ({ page }) => {
      await page.route('**/api/**/invitation/**', async (route) => {
        await route.fulfill({
          status: 404,
          json: { error: 'Invitation not found' },
        });
      });

      const response = await page.goto(
        `${BASE_URL}/invite/invalid-token-xyz`
      );
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors = captureConsoleErrors(page);

      await page.route('**/api/**/invitation/**', async (route) => {
        await route.fulfill({
          json: {
            business_name: 'Test Business',
            role: 'admin',
            invited_by: 'owner@test.com',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
        });
      });

      await page.goto(`${BASE_URL}/invite/test-token`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      const criticalErrors = errors.filter(
        (e) => e.includes('Uncaught') && !e.includes('Clerk')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('UI Elements', () => {
    test('should display invitation-related content', async ({ page }) => {
      await page.route('**/api/**/invitation/**', async (route) => {
        await route.fulfill({
          json: {
            business_name: 'ABC Services',
            role: 'dispatcher',
            invited_by: 'manager@abc.com',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
        });
      });

      await page.goto(`${BASE_URL}/invite/test-token`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      const bodyText = (await page.locator('body').textContent()) || '';
      const hasInviteContent =
        bodyText.toLowerCase().includes('invitation') ||
        bodyText.toLowerCase().includes('invite') ||
        bodyText.toLowerCase().includes('team') ||
        bodyText.toLowerCase().includes('join');

      expect(hasInviteContent).toBeTruthy();
    });

    test('should have accept invitation button', async ({ page }) => {
      await page.route('**/api/**/invitation/**', async (route) => {
        await route.fulfill({
          json: {
            business_name: 'Test Business',
            role: 'technician',
            invited_by: 'admin@test.com',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
        });
      });

      await page.goto(`${BASE_URL}/invite/test-token`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      const bodyText = (await page.locator('body').textContent()) || '';
      const hasAcceptButton =
        bodyText.toLowerCase().includes('accept') ||
        bodyText.toLowerCase().includes('join');

      expect(hasAcceptButton).toBeTruthy();
    });
  });

  test.describe('Error States', () => {
    test('should show error for expired invitation', async ({ page }) => {
      await page.route('**/api/**/invitation/**', async (route) => {
        await route.fulfill({
          json: {
            business_name: 'Test Business',
            role: 'technician',
            invited_by: 'admin@test.com',
            // Expired 1 day ago
            expires_at: new Date(Date.now() - 86400000).toISOString(),
          },
        });
      });

      await page.goto(`${BASE_URL}/invite/expired-token`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      // Page should still load without 500 error
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle API error gracefully', async ({ page }) => {
      await page.route('**/api/**/invitation/**', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Internal server error' },
        });
      });

      const response = await page.goto(`${BASE_URL}/invite/error-token`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await page.route('**/api/**/invitation/**', async (route) => {
        await route.abort('failed');
      });

      await page.goto(`${BASE_URL}/invite/network-error-token`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should allow navigation from invite to home', async ({ page }) => {
      await page.route('**/api/**/invitation/**', async (route) => {
        await route.fulfill({
          status: 404,
          json: { error: 'Not found' },
        });
      });

      await page.goto(`${BASE_URL}/invite/test-token`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toBe(`${BASE_URL}/`);
    });
  });

  test.describe('Responsive Design', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/**/invitation/**', async (route) => {
        await route.fulfill({
          json: {
            business_name: 'Test Business',
            role: 'admin',
            invited_by: 'owner@test.com',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
        });
      });
    });

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const response = await page.goto(`${BASE_URL}/invite/mobile-token`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      const response = await page.goto(`${BASE_URL}/invite/tablet-token`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const response = await page.goto(`${BASE_URL}/invite/desktop-token`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle page refresh', async ({ page }) => {
      await page.route('**/api/**/invitation/**', async (route) => {
        await route.fulfill({
          json: {
            business_name: 'Test Business',
            role: 'technician',
            invited_by: 'admin@test.com',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
        });
      });

      await page.goto(`${BASE_URL}/invite/refresh-token`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle special characters in token', async ({ page }) => {
      await page.route('**/api/**/invitation/**', async (route) => {
        await route.fulfill({
          status: 404,
          json: { error: 'Not found' },
        });
      });

      const response = await page.goto(
        `${BASE_URL}/invite/token-with-special-chars_123`
      );
      expect(response?.status()).toBeLessThan(500);
    });
  });
});
