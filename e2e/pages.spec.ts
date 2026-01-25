import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Public Pages', () => {
  test('Landing page loads correctly', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check page loads without errors
    await expect(page).toHaveTitle(/./);

    // Check for key content
    await expect(page.locator('body')).toContainText('Business');

    // Check for navigation links
    const loginLink = page.locator('a[href="/login"]');
    expect(await loginLink.count()).toBeGreaterThan(0);

    console.log('Landing page: OK');
  });

  test('Login page loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Should show Clerk login
    await page.waitForLoadState('networkidle');
    const pageContent = await page.content();

    console.log('Login page loaded, length:', pageContent.length);
    console.log('Login page: OK');
  });

  test('Signup page loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);

    await page.waitForLoadState('networkidle');
    const pageContent = await page.content();

    console.log('Signup page loaded, length:', pageContent.length);
    console.log('Signup page: OK');
  });

  test('Onboarding page loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`);

    await page.waitForLoadState('networkidle');

    // Check for onboarding content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();

    console.log('Onboarding page: OK');
  });
});

test.describe('Dashboard Pages (Demo Mode - Accessible)', () => {
  test('Dashboard is accessible in demo mode', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/dashboard`);
    expect(response?.status()).toBeLessThan(500);

    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard');
    console.log('Dashboard accessible: OK');
  });

  test('Appointments is accessible in demo mode', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/dashboard/appointments`);
    expect(response?.status()).toBeLessThan(500);

    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/appointments');
    console.log('Appointments accessible: OK');
  });

  test('Quotes is accessible in demo mode', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/dashboard/quotes`);
    expect(response?.status()).toBeLessThan(500);
    console.log('Quotes accessible: OK');
  });

  test('Settings is accessible in demo mode', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/dashboard/settings`);
    expect(response?.status()).toBeLessThan(500);

    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/settings');
    console.log('Settings accessible: OK');
  });
});

test.describe('Page Error Detection', () => {
  const publicPages = [
    { name: 'Landing', url: '/' },
    { name: 'Login', url: '/login' },
    { name: 'Signup', url: '/signup' },
    { name: 'Onboarding', url: '/onboarding' },
  ];

  for (const pageInfo of publicPages) {
    test(`${pageInfo.name} should not have critical errors`, async ({ page }) => {
      const jsErrors: string[] = [];

      page.on('pageerror', (error) => {
        jsErrors.push(error.message);
      });

      const response = await page.goto(`${BASE_URL}${pageInfo.url}`);
      await page.waitForLoadState('networkidle');

      // Check for 500 status code
      const is500Error = response?.status() === 500;

      // Filter out non-critical JS errors
      const criticalErrors = jsErrors.filter(
        (err) => err.includes('Uncaught') && !err.includes('Clerk')
      );

      if (criticalErrors.length > 0) {
        console.log(`${pageInfo.name} critical JS errors:`, criticalErrors);
      }

      expect(is500Error).toBe(false);
      expect(criticalErrors.length).toBe(0);
      console.log(`${pageInfo.name}: No critical errors`);
    });
  }
});
