import { test, expect } from '@playwright/test';
import { captureConsoleErrors } from './fixtures/helpers';

const BASE_URL = 'http://localhost:3000';

test.describe('Voice Page (Demo Mode)', () => {
  test.describe('Page Access', () => {
    test('should load voice page successfully', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/voice`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/voice');
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(`${BASE_URL}/dashboard/voice`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      const criticalErrors = errors.filter(
        (e) => e.includes('Uncaught') && !e.includes('Clerk')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('UI Elements', () => {
    test('should display voice/AI-related content', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/voice`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      const bodyText = (await page.locator('body').textContent()) || '';
      const hasVoiceContent =
        bodyText.toLowerCase().includes('voice') ||
        bodyText.toLowerCase().includes('ai') ||
        bodyText.toLowerCase().includes('call') ||
        bodyText.toLowerCase().includes('assistant') ||
        bodyText.toLowerCase().includes('vapi');

      expect(hasVoiceContent).toBeTruthy();
    });

    test('should have proper page structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/voice`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between voice and SMS pages', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/voice`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await page.goto(`${BASE_URL}/dashboard/sms`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/sms');
    });

    test('should navigate from voice to settings', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/voice`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/settings');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle page without Vapi configuration', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/voice`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle page refresh', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/voice`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');

      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
      expect(page.url()).toContain('/voice');
    });
  });
});
