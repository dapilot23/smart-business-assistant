import { test, expect } from '@playwright/test';

/**
 * Clerk Authentication E2E Tests
 *
 * Prerequisites:
 * - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be set
 * - CLERK_SECRET_KEY must be set
 * - App must be running on http://localhost:3000
 *
 * Run: pnpm test:e2e tests/e2e/auth.spec.ts
 */

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated users to login from dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display login page with Clerk component', async ({ page }) => {
    await page.goto('/login');

    // Check if Clerk's SignIn component is loaded
    await expect(page.locator('[data-clerk-element]')).toBeVisible({ timeout: 10000 });
  });

  test('should display signup page with Clerk component', async ({ page }) => {
    await page.goto('/signup');

    // Check if Clerk's SignUp component is loaded
    await expect(page.locator('[data-clerk-element]')).toBeVisible({ timeout: 10000 });
  });

  test('should have proper auth layout styling', async ({ page }) => {
    await page.goto('/login');

    // Check for centered card layout
    await expect(page.locator('text=Smart Business Assistant')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/calls',
    '/dashboard/messages',
    '/dashboard/settings',
  ];

  for (const route of protectedRoutes) {
    test(`should protect ${route}`, async ({ page }) => {
      await page.goto(route);

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe('Public Routes', () => {
  const publicRoutes = [
    { path: '/', title: 'Smart Business Assistant' },
    { path: '/login', title: 'Smart Business Assistant' },
    { path: '/signup', title: 'Smart Business Assistant' },
  ];

  for (const route of publicRoutes) {
    test(`should allow access to ${route.path}`, async ({ page }) => {
      await page.goto(route.path);

      // Should not redirect
      await expect(page).toHaveURL(route.path);
      await expect(page).toHaveTitle(new RegExp(route.title));
    });
  }
});
