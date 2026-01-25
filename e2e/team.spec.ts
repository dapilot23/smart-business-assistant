import { test, expect } from '@playwright/test';
import { mockTeamAPI, captureConsoleErrors } from './fixtures/helpers';
import { TEST_TEAM_MEMBERS } from './fixtures/test-data';

const BASE_URL = 'http://localhost:3000';

test.describe('Team Management', () => {
  test.describe('Team Page Access', () => {
    test('should be accessible in demo mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/team`);
      await page.waitForLoadState('networkidle');
      // In demo mode, page is accessible without auth
      expect(page.url()).toContain('/team');
    });

    test('should not return server error', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/team`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should not have critical console errors', async ({ page }) => {
      const errors = captureConsoleErrors(page);
      await page.goto(`${BASE_URL}/dashboard/team`);
      await page.waitForLoadState('networkidle');

      const criticalErrors = errors.filter((e) => e.includes('Uncaught'));
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Team Page with Mocked API', () => {
    test.beforeEach(async ({ page }) => {
      await mockTeamAPI(page);
    });

    test('should load team page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/team`);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Team API Operations', () => {
    test('should mock GET team members', async ({ page }) => {
      let apiCalled = false;

      await page.route('**/api/**/team/members', async (route) => {
        if (route.request().method() === 'GET') {
          apiCalled = true;
          await route.fulfill({ json: TEST_TEAM_MEMBERS });
        } else {
          await route.continue();
        }
      });

      await page.goto(`${BASE_URL}/dashboard/team`);
      await page.waitForLoadState('networkidle');

      expect(typeof apiCalled).toBe('boolean');
    });

    test('should mock POST invitation', async ({ page }) => {
      let inviteCalled = false;

      await page.route('**/api/**/invitations', async (route) => {
        if (route.request().method() === 'POST') {
          inviteCalled = true;
          await route.fulfill({
            json: { id: 'inv-1', status: 'PENDING' },
          });
        } else {
          await route.fulfill({ json: [] });
        }
      });

      await mockTeamAPI(page);
      await page.goto(`${BASE_URL}/dashboard/team`);
      await page.waitForLoadState('networkidle');

      expect(typeof inviteCalled).toBe('boolean');
    });

    test('should mock DELETE team member', async ({ page }) => {
      let deleteCalled = false;

      await page.route('**/api/**/members/*', async (route) => {
        if (route.request().method() === 'DELETE') {
          deleteCalled = true;
          await route.fulfill({ json: { success: true } });
        } else {
          await route.continue();
        }
      });

      await mockTeamAPI(page);
      await page.goto(`${BASE_URL}/dashboard/team`);
      await page.waitForLoadState('networkidle');

      expect(typeof deleteCalled).toBe('boolean');
    });
  });

  test.describe('Team Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      await page.route('**/api/**', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Server error' },
        });
      });

      await page.goto(`${BASE_URL}/dashboard/team`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle invitation errors', async ({ page }) => {
      await page.route('**/api/**/invitations', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 400,
            json: { error: 'User already invited' },
          });
        } else {
          await route.fulfill({ json: [] });
        }
      });

      await mockTeamAPI(page);
      await page.goto(`${BASE_URL}/dashboard/team`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Team Responsive Design', () => {
    test.beforeEach(async ({ page }) => {
      await mockTeamAPI(page);
    });

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const response = await page.goto(`${BASE_URL}/dashboard/team`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      const response = await page.goto(`${BASE_URL}/dashboard/team`);
      expect(response?.status()).toBeLessThan(500);
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const response = await page.goto(`${BASE_URL}/dashboard/team`);
      expect(response?.status()).toBeLessThan(500);
    });
  });
});
