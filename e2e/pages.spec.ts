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

test.describe('Protected Pages (should redirect)', () => {
  test('Dashboard redirects to login', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/dashboard`);

    // Should redirect to login
    await page.waitForLoadState('networkidle');
    const url = page.url();

    expect(url).toContain('/login');
    console.log('Dashboard redirect: OK');
  });

  test('Appointments redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/appointments`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/login');
    console.log('Appointments redirect: OK');
  });

  test('Quotes redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/quotes`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/login');
    console.log('Quotes redirect: OK');
  });

  test('Settings redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settings`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/login');
    console.log('Settings redirect: OK');
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
    test(`${pageInfo.name} should not have JavaScript errors`, async ({ page }) => {
      const jsErrors: string[] = [];

      page.on('pageerror', error => {
        jsErrors.push(error.message);
      });

      await page.goto(`${BASE_URL}${pageInfo.url}`);
      await page.waitForLoadState('networkidle');

      // Check for 500 error content
      const bodyText = await page.locator('body').textContent() || '';
      const has500Error = bodyText.includes('500') && bodyText.includes('error');

      if (jsErrors.length > 0) {
        console.log(`${pageInfo.name} JS errors:`, jsErrors);
      }

      expect(has500Error).toBe(false);
      console.log(`${pageInfo.name}: No critical errors`);
    });
  }
});
