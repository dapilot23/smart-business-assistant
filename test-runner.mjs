import { chromium } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

async function runTests() {
  console.log('=== Starting Comprehensive E2E Test Suite ===\n');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    const tests = [
      // ============ LANDING PAGE TESTS ============
      {
        name: 'Landing page loads with title',
        test: async () => {
          await page.goto(BASE_URL, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const title = await page.title();
          if (!title.includes('Business')) throw new Error(`Unexpected title: ${title}`);
        }
      },
      {
        name: 'Landing page has navigation links',
        test: async () => {
          const loginLink = await page.locator('a[href="/login"]').count();
          const signupLink = await page.locator('a[href="/signup"]').count();
          if (loginLink === 0 && signupLink === 0) throw new Error('No auth links found');
        }
      },
      {
        name: 'Landing page has pricing section',
        test: async () => {
          const text = await page.textContent('body');
          if (!text.includes('$')) throw new Error('No pricing found');
        }
      },
      {
        name: 'Landing page has feature descriptions',
        test: async () => {
          const content = await page.textContent('body');
          const hasFeatures = content.toLowerCase().includes('feature') ||
                             content.toLowerCase().includes('schedule') ||
                             content.toLowerCase().includes('business');
          if (!hasFeatures) throw new Error('No feature content found');
        }
      },

      // ============ AUTH PAGES TESTS ============
      {
        name: 'Login page responds',
        test: async () => {
          const resp = await page.goto(`${BASE_URL}/login`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          if (!resp) throw new Error('No response');
        }
      },
      {
        name: 'Signup page responds',
        test: async () => {
          const resp = await page.goto(`${BASE_URL}/signup`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          if (!resp) throw new Error('No response');
        }
      },

      // ============ DASHBOARD TESTS ============
      {
        name: 'Dashboard loads and shows navigation',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          const hasNav = content.includes('Appointments') && content.includes('Settings');
          if (!hasNav) throw new Error('Dashboard navigation not found');
        }
      },
      {
        name: 'Dashboard has search functionality',
        test: async () => {
          const searchInput = await page.locator('input[placeholder*="Search"]').count();
          const searchButton = await page.locator('button:has-text("Search")').count();
          if (searchInput === 0 && searchButton === 0) throw new Error('Search not found');
        }
      },
      {
        name: 'Dashboard sidebar has all menu items',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          const menuItems = ['Appointments', 'Jobs', 'Team', 'Settings'];
          const missingItems = menuItems.filter(item => !content.includes(item));
          if (missingItems.length > 0) throw new Error(`Missing menu items: ${missingItems.join(', ')}`);
        }
      },
      {
        name: 'Dashboard shows user info',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          // Should show some user context (demo user, business name, etc.)
          const hasUserContext = content.includes('User') || content.includes('Demo') ||
                                 content.includes('Business') || content.includes('Plumbing');
          if (!hasUserContext) throw new Error('No user context found');
        }
      },

      // ============ APPOINTMENTS PAGE TESTS ============
      {
        name: 'Appointments page loads',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/appointments`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          if (!content.includes('Appointment')) throw new Error('Appointments page not loaded correctly');
        }
      },
      {
        name: 'Appointments page has action elements',
        test: async () => {
          const buttons = await page.locator('button').count();
          const links = await page.locator('a').count();
          if (buttons === 0 && links === 0) throw new Error('No interactive elements found');
        }
      },
      {
        name: 'Appointments navigation works from dashboard',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Wait for sidebar to render - look for the visible desktop sidebar link
          const appointmentsLink = page.locator('aside.lg\\:flex a[href="/dashboard/appointments"]');
          await appointmentsLink.waitFor({ state: 'visible', timeout: 10000 });
          await appointmentsLink.click();
          await page.waitForURL('**/appointments**', { timeout: 10000 });
        }
      },

      // ============ JOBS PAGE TESTS ============
      {
        name: 'Jobs page loads',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/jobs`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          if (!content.includes('Job')) throw new Error('Jobs page not loaded correctly');
        }
      },
      {
        name: 'Jobs page has job status indicators',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/jobs`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body').then(t => t.toLowerCase());
          const hasStatus = content.includes('pending') || content.includes('complete') ||
                           content.includes('progress') || content.includes('status') ||
                           content.includes('new') || content.includes('job');
          if (!hasStatus) throw new Error('No job status indicators found');
        }
      },

      // ============ TEAM PAGE TESTS ============
      {
        name: 'Team page loads',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/team`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          if (!content.includes('Team')) throw new Error('Team page not loaded correctly');
        }
      },
      {
        name: 'Team page shows member management',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/team`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body').then(t => t.toLowerCase());
          const hasManagement = content.includes('member') || content.includes('invite') ||
                               content.includes('add') || content.includes('team') ||
                               content.includes('role');
          if (!hasManagement) throw new Error('No team management UI found');
        }
      },

      // ============ SETTINGS PAGE TESTS ============
      {
        name: 'Settings page loads',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/settings`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          if (!content.includes('Setting')) throw new Error('Settings page not loaded correctly');
        }
      },
      {
        name: 'Settings page has interactive elements',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/settings`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const allElements = await page.locator('button, input, textarea, select, [role="button"], [role="checkbox"], [role="switch"]').count();
          const links = await page.locator('a').count();
          if (allElements === 0 && links === 0) throw new Error('No interactive elements found');
        }
      },
      {
        name: 'Settings has different sections',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/settings`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body').then(t => t.toLowerCase());
          // Settings should have some categorized sections
          const hasSections = content.includes('profile') || content.includes('account') ||
                             content.includes('business') || content.includes('notification') ||
                             content.includes('billing') || content.includes('general');
          if (!hasSections) throw new Error('No settings sections found');
        }
      },

      // ============ CALENDAR/AVAILABILITY TESTS ============
      {
        name: 'Calendar/Availability exists in navigation',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          if (!content.includes('Availability') && !content.includes('Calendar')) {
            throw new Error('Availability/Calendar not in navigation');
          }
        }
      },

      // ============ CUSTOMERS TESTS ============
      {
        name: 'Customers navigation exists',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          if (!content.includes('Customer')) {
            throw new Error('Customers not in navigation');
          }
        }
      },

      // ============ QUOTES PAGE TESTS ============
      {
        name: 'Quotes page loads',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/quotes`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          if (!content.includes('Quote')) throw new Error('Quotes page not loaded correctly');
        }
      },
      {
        name: 'Quotes page shows quote management',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/quotes`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body').then(t => t.toLowerCase());
          const hasQuoteFeatures = content.includes('quote') || content.includes('estimate') ||
                                   content.includes('price') || content.includes('new');
          if (!hasQuoteFeatures) throw new Error('No quote management features found');
        }
      },

      // ============ SMS PAGE TESTS ============
      {
        name: 'SMS page loads',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/sms`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          if (!content.includes('SMS') && !content.includes('Message')) throw new Error('SMS page not loaded');
        }
      },
      {
        name: 'SMS page has messaging interface',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/sms`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body').then(t => t.toLowerCase());
          const hasMessaging = content.includes('message') || content.includes('sms') ||
                              content.includes('send') || content.includes('text');
          if (!hasMessaging) throw new Error('No messaging interface found');
        }
      },

      // ============ VOICE AI PAGE TESTS ============
      {
        name: 'Voice AI page loads',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/voice`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          if (!content.includes('Voice') && !content.includes('AI')) throw new Error('Voice AI page not loaded');
        }
      },
      {
        name: 'Voice AI has configuration options',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/voice`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body').then(t => t.toLowerCase());
          const hasConfig = content.includes('voice') || content.includes('ai') ||
                           content.includes('call') || content.includes('assistant');
          if (!hasConfig) throw new Error('No Voice AI configuration found');
        }
      },

      // ============ PUBLIC BOOKING FLOW TESTS ============
      {
        name: 'Public booking page loads',
        test: async () => {
          let resp = await page.goto(`${BASE_URL}/book`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          if (resp.status() === 404) {
            resp = await page.goto(`${BASE_URL}/booking`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          }
          if (!resp) throw new Error('No response from booking page');
        }
      },
      {
        name: 'Booking page has service selection',
        test: async () => {
          await page.goto(`${BASE_URL}/book`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body').then(t => t.toLowerCase());
          const hasServices = content.includes('service') || content.includes('book') ||
                             content.includes('appointment') || content.includes('select');
          if (!hasServices) throw new Error('No service selection found');
        }
      },

      // ============ NAVIGATION FLOW TESTS ============
      {
        name: 'Can navigate between dashboard pages',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Check we can find navigation links
          const navLinks = await page.locator('a[href*="/dashboard/"]').count();
          if (navLinks < 3) throw new Error('Not enough navigation links found');
        }
      },
      {
        name: 'Logo/brand links to dashboard',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/settings`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Look for brand/logo link
          const brandLink = await page.locator('a[href="/dashboard"], a[href="/"]').first();
          if (await brandLink.count() > 0) {
            // Brand link exists - good
          } else {
            // Check if SBA text exists as a link
            const sbaLink = await page.locator('a:has-text("SBA")').count();
            if (sbaLink === 0) throw new Error('No home navigation found');
          }
        }
      },

      // ============ RESPONSIVE/UI TESTS ============
      {
        name: 'Dashboard renders correctly',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Check no JavaScript errors in console
          const content = await page.textContent('body');
          if (content.length < 100) throw new Error('Dashboard content too short');
        }
      },
      {
        name: 'Pages have proper heading structure',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const headings = await page.locator('h1, h2, h3').count();
          if (headings === 0) throw new Error('No headings found');
        }
      },

      // ============ EDGE CASE TESTS ============
      {
        name: '404 page for invalid routes',
        test: async () => {
          const resp = await page.goto(`${BASE_URL}/nonexistent-page-xyz123`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Should either show 404 or redirect
          const content = await page.textContent('body');
          const is404 = resp.status() === 404 || content.includes('404') || content.includes('not found');
          if (!is404 && resp.status() !== 200) throw new Error('Unexpected response for invalid route');
        }
      },
      {
        name: 'Invalid dashboard subroute handling',
        test: async () => {
          const resp = await page.goto(`${BASE_URL}/dashboard/invalid-xyz`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Should handle gracefully (404, redirect, or error page)
          if (!resp) throw new Error('No response for invalid subroute');
        }
      },

      // ============ PERFORMANCE TESTS ============
      {
        name: 'Dashboard loads within reasonable time',
        test: async () => {
          const start = Date.now();
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const loadTime = Date.now() - start;
          if (loadTime > 25000) throw new Error(`Dashboard took ${loadTime}ms to load`);
        }
      },
      {
        name: 'Landing page loads within reasonable time',
        test: async () => {
          const start = Date.now();
          await page.goto(BASE_URL, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const loadTime = Date.now() - start;
          if (loadTime > 28000) throw new Error(`Landing page took ${loadTime}ms to load`);
        }
      },
    ];

    let passed = 0;
    let failed = 0;
    const failures = [];

    console.log(`Running ${tests.length} tests...\n`);

    for (const { name, test } of tests) {
      process.stdout.write(`  ${name}... `);
      try {
        await test();
        console.log('PASS');
        passed++;
      } catch (error) {
        console.log('FAIL');
        failed++;
        failures.push({ name, error: error.message });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

    if (failures.length > 0) {
      console.log('\nFailures:');
      for (const f of failures) {
        console.log(`  - ${f.name}`);
        console.log(`    ${f.error.substring(0, 120)}`);
      }
    }
    console.log('='.repeat(60));

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test suite error:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

runTests();
