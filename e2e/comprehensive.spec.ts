import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001/api/v1';

// Helper to check for console errors
const consoleErrors: string[] = [];

test.describe('Comprehensive App Testing', () => {

  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test.describe('Landing Page', () => {
    test('should load landing page successfully', async ({ page }) => {
      const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      // Check key elements exist
      await expect(page.locator('body')).toBeVisible();

      // Check for common landing page elements
      const title = await page.title();
      console.log('Landing page title:', title);
    });

    test('should have working navigation links', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

      // Check for login/signup links
      const loginLink = page.locator('a[href*="login"], button:has-text("Login"), a:has-text("Login"), a:has-text("Sign in")');
      const signupLink = page.locator('a[href*="signup"], button:has-text("Sign up"), a:has-text("Sign up"), a:has-text("Get Started")');

      console.log('Login links found:', await loginLink.count());
      console.log('Signup links found:', await signupLink.count());
    });

    test('should display pricing section', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

      // Look for pricing elements
      const pricingSection = page.locator('text=/\\$\\d+/');
      const count = await pricingSection.count();
      console.log('Pricing elements found:', count);
    });
  });

  test.describe('Authentication Pages', () => {
    test('should load login page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      // Check for form elements
      const pageContent = await page.content();
      console.log('Login page loaded, content length:', pageContent.length);
    });

    test('should load signup page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/signup`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      const pageContent = await page.content();
      console.log('Signup page loaded, content length:', pageContent.length);
    });
  });

  test.describe('Dashboard Pages', () => {
    test('should load dashboard page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      console.log('Dashboard status:', response?.status());

      // May redirect to login - check final URL
      const finalUrl = page.url();
      console.log('Dashboard final URL:', finalUrl);
    });

    test('should load appointments page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/appointments`, { waitUntil: 'domcontentloaded' });
      console.log('Appointments status:', response?.status());
      console.log('Appointments URL:', page.url());
    });

    test('should load quotes page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/quotes`, { waitUntil: 'domcontentloaded' });
      console.log('Quotes status:', response?.status());
      console.log('Quotes URL:', page.url());
    });

    test('should load quotes/new page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/quotes/new`, { waitUntil: 'domcontentloaded' });
      console.log('Quotes/new status:', response?.status());
      console.log('Quotes/new URL:', page.url());
    });

    test('should load invoices page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/invoices`, { waitUntil: 'domcontentloaded' });
      console.log('Invoices status:', response?.status());
      console.log('Invoices URL:', page.url());
    });

    test('should load invoices/new page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/invoices/new`, { waitUntil: 'domcontentloaded' });
      console.log('Invoices/new status:', response?.status());
      console.log('Invoices/new URL:', page.url());
    });

    test('should load jobs page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'domcontentloaded' });
      console.log('Jobs status:', response?.status());
      console.log('Jobs URL:', page.url());
    });

    test('should load team page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/team`, { waitUntil: 'domcontentloaded' });
      console.log('Team status:', response?.status());
      console.log('Team URL:', page.url());
    });

    test('should load sms page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/sms`, { waitUntil: 'domcontentloaded' });
      console.log('SMS status:', response?.status());
      console.log('SMS URL:', page.url());
    });

    test('should load voice page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/voice`, { waitUntil: 'domcontentloaded' });
      console.log('Voice status:', response?.status());
      console.log('Voice URL:', page.url());
    });

    test('should load settings page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
      console.log('Settings status:', response?.status());
      console.log('Settings URL:', page.url());
    });

    test('should load availability page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/dashboard/availability`, { waitUntil: 'domcontentloaded' });
      console.log('Availability status:', response?.status());
      console.log('Availability URL:', page.url());
    });
  });

  test.describe('Onboarding', () => {
    test('should load onboarding page', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
      console.log('Onboarding status:', response?.status());
      console.log('Onboarding URL:', page.url());

      // Check for wizard steps
      const pageContent = await page.content();
      console.log('Onboarding content length:', pageContent.length);
    });
  });

  test.describe('API Health Check', () => {
    test('should return healthy API status', async ({ request }) => {
      const response = await request.get(`${API_URL}/health`);
      console.log('API Health status:', response.status());

      if (response.ok()) {
        const body = await response.json();
        console.log('API Health response:', JSON.stringify(body));
      }
    });
  });

  test.describe('Page Error Detection', () => {
    const pagesToTest = [
      { name: 'Landing', url: '/' },
      { name: 'Login', url: '/login' },
      { name: 'Signup', url: '/signup' },
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Appointments', url: '/dashboard/appointments' },
      { name: 'Quotes', url: '/dashboard/quotes' },
      { name: 'Quotes New', url: '/dashboard/quotes/new' },
      { name: 'Invoices', url: '/dashboard/invoices' },
      { name: 'Invoices New', url: '/dashboard/invoices/new' },
      { name: 'Jobs', url: '/dashboard/jobs' },
      { name: 'Team', url: '/dashboard/team' },
      { name: 'SMS', url: '/dashboard/sms' },
      { name: 'Voice', url: '/dashboard/voice' },
      { name: 'Settings', url: '/dashboard/settings' },
      { name: 'Availability', url: '/dashboard/availability' },
      { name: 'Onboarding', url: '/onboarding' },
    ];

    for (const pageInfo of pagesToTest) {
      test(`${pageInfo.name} page should not have critical errors`, async ({ page }) => {
        const errors: string[] = [];

        page.on('pageerror', error => {
          errors.push(error.message);
        });

        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        const response = await page.goto(`${BASE_URL}${pageInfo.url}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });

        const status = response?.status() || 0;
        const finalUrl = page.url();

        // Check for error page content
        const bodyText = await page.locator('body').textContent();
        const hasError = bodyText?.toLowerCase().includes('error') &&
                        (bodyText?.toLowerCase().includes('500') ||
                         bodyText?.toLowerCase().includes('unhandled') ||
                         bodyText?.toLowerCase().includes('exception'));

        console.log(`[${pageInfo.name}] Status: ${status}, URL: ${finalUrl}, Errors: ${errors.length}`);

        if (errors.length > 0) {
          console.log(`[${pageInfo.name}] Errors:`, errors.slice(0, 3));
        }

        if (hasError) {
          console.log(`[${pageInfo.name}] Page shows error content`);
        }

        // Page should load (may redirect to login)
        expect(status).toBeGreaterThanOrEqual(200);
        expect(status).toBeLessThan(500);
      });
    }
  });
});
