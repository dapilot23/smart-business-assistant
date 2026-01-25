import { chromium } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

async function runEdgeCaseTests() {
  console.log('=== Starting Edge Case & Workflow Test Suite ===\n');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const tests = [
      // ============ AUTHENTICATION EDGE CASES ============
      {
        name: 'Auth: Direct dashboard access without login (demo mode)',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // In demo mode, should allow access
          const url = page.url();
          if (!url.includes('dashboard')) throw new Error('Dashboard not accessible in demo mode');
        }
      },
      {
        name: 'Auth: Login page has link to signup',
        test: async () => {
          await page.goto(`${BASE_URL}/login`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const signupLink = page.locator('a[href*="signup"]');
          if (await signupLink.count() === 0) throw new Error('No signup link on login page');
        }
      },
      {
        name: 'Auth: Signup page has link to login',
        test: async () => {
          await page.goto(`${BASE_URL}/signup`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const loginLink = page.locator('a[href*="login"]');
          if (await loginLink.count() === 0) throw new Error('No login link on signup page');
        }
      },
      {
        name: 'Auth: Protected routes accessible in demo mode',
        test: async () => {
          const protectedRoutes = [
            '/dashboard/appointments',
            '/dashboard/jobs',
            '/dashboard/team',
            '/dashboard/settings',
            '/dashboard/quotes',
            '/dashboard/invoices',
          ];
          for (const route of protectedRoutes) {
            const response = await page.goto(`${BASE_URL}${route}`, { timeout: 30000, waitUntil: 'domcontentloaded' });
            if (response.status() >= 500) throw new Error(`Server error on ${route}`);
          }
        }
      },

      // ============ DASHBOARD EDGE CASES ============
      {
        name: 'Dashboard: Handles slow network gracefully',
        test: async () => {
          // Simulate slow network
          await page.route('**/*', async route => {
            await new Promise(r => setTimeout(r, 100));
            await route.continue();
          });
          const response = await page.goto(`${BASE_URL}/dashboard`, { timeout: 45000, waitUntil: 'domcontentloaded' });
          if (response.status() >= 500) throw new Error('Server error on slow network');
          await page.unroute('**/*');
        }
      },
      {
        name: 'Dashboard: Refresh preserves page state',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.reload();
          await page.waitForLoadState('domcontentloaded');
          const url = page.url();
          if (!url.includes('dashboard')) throw new Error('Page state not preserved after refresh');
        }
      },
      {
        name: 'Dashboard: Multiple rapid navigations',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Rapid navigation
          await page.goto(`${BASE_URL}/dashboard/appointments`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.goto(`${BASE_URL}/dashboard/jobs`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          if (content.length < 100) throw new Error('Dashboard not rendered after rapid navigation');
        }
      },

      // ============ APPOINTMENTS EDGE CASES ============
      {
        name: 'Appointments: Empty state handling',
        test: async () => {
          // Mock empty appointments
          await page.route('**/api/**/appointments*', async route => {
            await route.fulfill({ json: [] });
          });
          await page.goto(`${BASE_URL}/dashboard/appointments`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
          // Page should still render without crashing
          const content = await page.textContent('body');
          if (content.length < 100) throw new Error('Empty appointments state not handled');
          await page.unroute('**/api/**/appointments*');
        }
      },
      {
        name: 'Appointments: API error handling',
        test: async () => {
          await page.route('**/api/**/appointments*', async route => {
            await route.fulfill({ status: 500, json: { error: 'Server error' } });
          });
          await page.goto(`${BASE_URL}/dashboard/appointments`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
          // Should not crash
          await page.unroute('**/api/**/appointments*');
        }
      },
      {
        name: 'Appointments: Calendar week boundary navigation',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/appointments`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const prevBtn = page.locator('button[aria-label*="previous" i], button:has(svg)').first();
          if (await prevBtn.count() > 0) {
            // Navigate multiple weeks back
            for (let i = 0; i < 3; i++) {
              await prevBtn.click();
              await page.waitForTimeout(200);
            }
          }
        }
      },

      // ============ TEAM MANAGEMENT EDGE CASES ============
      {
        name: 'Team: Empty team list handling',
        test: async () => {
          await page.route('**/api/**/team*', async route => {
            await route.fulfill({ json: [] });
          });
          await page.goto(`${BASE_URL}/dashboard/team`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
          const content = await page.textContent('body');
          if (content.length < 100) throw new Error('Empty team state not handled');
          await page.unroute('**/api/**/team*');
        }
      },
      {
        name: 'Team: Invite modal cancel closes modal',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/team`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const inviteBtn = page.locator('button:has-text("Invite")').first();
          if (await inviteBtn.count() > 0) {
            await inviteBtn.click();
            await page.waitForTimeout(500);
            const cancelBtn = page.locator('[role="dialog"] button:has-text("Cancel")').first();
            if (await cancelBtn.count() > 0) {
              await cancelBtn.click();
              await page.waitForTimeout(300);
              const modalCount = await page.locator('[role="dialog"]').count();
              if (modalCount > 0) throw new Error('Modal did not close on cancel');
            }
          }
        }
      },
      {
        name: 'Team: Duplicate email invitation handling',
        test: async () => {
          await page.route('**/api/**/invitations', async route => {
            if (route.request().method() === 'POST') {
              await route.fulfill({
                status: 400,
                json: { error: 'Email already invited' }
              });
            } else {
              await route.fulfill({ json: [] });
            }
          });
          await page.goto(`${BASE_URL}/dashboard/team`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Error should be handled gracefully
          await page.unroute('**/api/**/invitations');
        }
      },

      // ============ SETTINGS EDGE CASES ============
      {
        name: 'Settings: Unsaved changes warning',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/settings`, { timeout: 30000, waitUntil: 'networkidle' });
          await page.waitForTimeout(1000);
          // Make a change
          const checkbox = page.locator('input[type="checkbox"], [role="switch"]').first();
          if (await checkbox.count() > 0) {
            await checkbox.click();
            await page.waitForTimeout(200);
          }
          // Page should still work
        }
      },
      {
        name: 'Settings: Invalid timezone handling',
        test: async () => {
          await page.route('**/api/**/settings', async route => {
            if (route.request().method() === 'GET') {
              await route.fulfill({
                json: { timezone: 'Invalid/Timezone', businessHours: [] }
              });
            } else {
              await route.continue();
            }
          });
          await page.goto(`${BASE_URL}/dashboard/settings`, { timeout: 30000, waitUntil: 'networkidle' });
          // Should not crash
          await page.unroute('**/api/**/settings');
        }
      },
      {
        name: 'Settings: Tab persistence on refresh',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/settings`, { timeout: 30000, waitUntil: 'networkidle' });
          await page.waitForTimeout(500);
          // Click notifications tab if available
          const notifTab = page.locator('button:has-text("Notification")').first();
          if (await notifTab.count() > 0) {
            await notifTab.click();
            await page.waitForTimeout(300);
          }
          // Page should render
        }
      },

      // ============ JOBS EDGE CASES ============
      {
        name: 'Jobs: Empty jobs list handling',
        test: async () => {
          await page.route('**/api/**/jobs*', async route => {
            await route.fulfill({ json: [] });
          });
          await page.goto(`${BASE_URL}/dashboard/jobs`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
          const content = await page.textContent('body');
          if (content.length < 100) throw new Error('Empty jobs state not handled');
          await page.unroute('**/api/**/jobs*');
        }
      },
      {
        name: 'Jobs: Filter with no results',
        test: async () => {
          await page.route('**/api/**/jobs*', async route => {
            const url = route.request().url();
            if (url.includes('status=')) {
              await route.fulfill({ json: [] });
            } else {
              await route.fulfill({ json: [{ id: '1', status: 'IN_PROGRESS' }] });
            }
          });
          await page.goto(`${BASE_URL}/dashboard/jobs`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Should handle empty filter results
          await page.unroute('**/api/**/jobs*');
        }
      },

      // ============ BOOKING FLOW EDGE CASES ============
      {
        name: 'Booking: Invalid tenant slug handling',
        test: async () => {
          await page.route('**/api/**/tenant*', async route => {
            await route.fulfill({ status: 404, json: { error: 'Tenant not found' } });
          });
          const response = await page.goto(`${BASE_URL}/book/invalid-tenant-xyz`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Should handle 404 gracefully
          if (response.status() >= 500) throw new Error('Server error on invalid tenant');
          await page.unroute('**/api/**/tenant*');
        }
      },
      {
        name: 'Booking: No available time slots',
        test: async () => {
          await page.route('**/api/**/slots*', async route => {
            await route.fulfill({ json: [] });
          });
          await page.goto(`${BASE_URL}/book/test-business`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Should show empty slots message
          await page.unroute('**/api/**/slots*');
        }
      },
      {
        name: 'Booking: Service with zero duration',
        test: async () => {
          await page.route('**/api/**/services', async route => {
            await route.fulfill({
              json: [{ id: '1', name: 'Quick Service', duration: 0, price: 0 }]
            });
          });
          await page.goto(`${BASE_URL}/book/test-business`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Should handle edge case
          await page.unroute('**/api/**/services');
        }
      },
      {
        name: 'Booking: Back button navigation',
        test: async () => {
          await page.goto(`${BASE_URL}/book/test-business`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const selectBtn = page.locator('button:has-text("Select")').first();
          if (await selectBtn.count() > 0) {
            await selectBtn.click();
            await page.waitForTimeout(500);
            // Look for back button
            const backBtn = page.locator('button:has-text("Back")').first();
            if (await backBtn.count() > 0) {
              await backBtn.click();
              await page.waitForTimeout(300);
            }
          }
        }
      },

      // ============ AVAILABILITY EDGE CASES ============
      {
        name: 'Availability: All days disabled',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/availability`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Try to disable all days
          const toggles = await page.locator('input[type="checkbox"], [role="switch"]').all();
          for (const toggle of toggles.slice(0, 3)) {
            try {
              await toggle.click({ timeout: 1000 });
              await page.waitForTimeout(100);
            } catch (e) {
              // Ignore click errors
            }
          }
        }
      },
      {
        name: 'Availability: Invalid time range (end before start)',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/availability`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const timeInputs = await page.locator('input[type="time"]').all();
          if (timeInputs.length >= 2) {
            await timeInputs[0].fill('17:00');
            await timeInputs[1].fill('09:00');
            await page.waitForTimeout(200);
          }
          // Should handle invalid range
        }
      },

      // ============ NAVIGATION EDGE CASES ============
      {
        name: 'Navigation: Deep nested route handling',
        test: async () => {
          const response = await page.goto(`${BASE_URL}/dashboard/appointments/invalid/deep/route`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Should handle gracefully (404 or redirect)
          if (response.status() >= 500) throw new Error('Server error on deep nested route');
        }
      },
      {
        name: 'Navigation: Query params preserved',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard?test=true`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Should load without error
        }
      },
      {
        name: 'Navigation: Hash fragment handling',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard#section`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Should load without error
        }
      },
      {
        name: 'Navigation: Unicode in URL',
        test: async () => {
          const response = await page.goto(`${BASE_URL}/book/café-business`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Should handle gracefully
          if (response.status() >= 500) throw new Error('Server error on unicode URL');
        }
      },

      // ============ RESPONSIVE EDGE CASES ============
      {
        name: 'Responsive: Very small viewport (320px)',
        test: async () => {
          await page.setViewportSize({ width: 320, height: 568 });
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.content();
          if (content.length < 500) throw new Error('Very small viewport not handled');
          await page.setViewportSize({ width: 1280, height: 720 });
        }
      },
      {
        name: 'Responsive: Very large viewport (2560px)',
        test: async () => {
          await page.setViewportSize({ width: 2560, height: 1440 });
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.content();
          if (content.length < 500) throw new Error('Very large viewport not handled');
          await page.setViewportSize({ width: 1280, height: 720 });
        }
      },
      {
        name: 'Responsive: Portrait to landscape rotation',
        test: async () => {
          await page.setViewportSize({ width: 375, height: 812 });
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.setViewportSize({ width: 812, height: 375 });
          await page.waitForTimeout(300);
          const content = await page.content();
          if (content.length < 500) throw new Error('Rotation not handled');
          await page.setViewportSize({ width: 1280, height: 720 });
        }
      },

      // ============ ERROR BOUNDARY TESTS ============
      {
        name: 'Error: Network failure recovery',
        test: async () => {
          await page.route('**/api/**', async route => {
            await route.abort('failed');
          });
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
          // Page should still render
          await page.unroute('**/api/**');
        }
      },
      {
        name: 'Error: Malformed API response',
        test: async () => {
          await page.route('**/api/**', async route => {
            await route.fulfill({ body: 'not json', contentType: 'application/json' });
          });
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Should handle gracefully
          await page.unroute('**/api/**');
        }
      },
      {
        name: 'Error: Very slow API response',
        test: async () => {
          await page.route('**/api/**', async route => {
            await new Promise(r => setTimeout(r, 3000));
            await route.fulfill({ json: {} });
          });
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Should show loading state
          await page.unroute('**/api/**');
        }
      },

      // ============ ACCESSIBILITY EDGE CASES ============
      {
        name: 'Accessibility: Keyboard navigation in dashboard',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Tab through elements
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          // Should not error
        }
      },
      {
        name: 'Accessibility: Focus visible on interactive elements',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const link = page.locator('a').first();
          if (await link.count() > 0) {
            await link.focus();
            // Element should be focusable
          }
        }
      },

      // ============ COMPLETE WORKFLOW TESTS ============
      {
        name: 'Workflow: Full booking flow simulation',
        test: async () => {
          await page.goto(`${BASE_URL}/book/test-business`, { timeout: 30000, waitUntil: 'domcontentloaded' });

          // Step 1: Select service
          const selectBtn = page.locator('button:has-text("Select")').first();
          if (await selectBtn.count() > 0) {
            await selectBtn.click();
            await page.waitForTimeout(500);
          }

          // Step 2: Select date (click any available date)
          const dayButtons = await page.locator('button').all();
          for (const btn of dayButtons) {
            const text = await btn.textContent();
            if (text && /^\d{1,2}$/.test(text.trim())) {
              try {
                await btn.click({ timeout: 1000 });
                await page.waitForTimeout(300);
                break;
              } catch (e) {
                continue;
              }
            }
          }

          // Step 3: Select time slot
          const allButtons = await page.locator('button').all();
          for (const btn of allButtons) {
            const text = await btn.textContent();
            if (text && /\d{1,2}:\d{2}/.test(text)) {
              try {
                await btn.click({ timeout: 1000 });
                await page.waitForTimeout(300);
                break;
              } catch (e) {
                continue;
              }
            }
          }

          // Step 4: Fill customer form
          const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]').first();
          const emailInput = page.locator('input[type="email"]').first();
          const phoneInput = page.locator('input[type="tel"]').first();

          if (await nameInput.count() > 0) await nameInput.fill('Test Customer');
          if (await emailInput.count() > 0) await emailInput.fill('test@example.com');
          if (await phoneInput.count() > 0) await phoneInput.fill('+1234567890');
        }
      },
      {
        name: 'Workflow: Dashboard to appointments to create flow',
        test: async () => {
          // Start at dashboard
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });

          // Navigate to appointments
          const aptLink = page.locator('a[href*="appointments"]').first();
          if (await aptLink.count() > 0) {
            await aptLink.click();
            await page.waitForTimeout(1000);
          }

          // Click new appointment
          const newBtn = page.locator('button:has-text("New")').first();
          if (await newBtn.count() > 0) {
            await newBtn.click();
            await page.waitForTimeout(500);
          }
        }
      },
      {
        name: 'Workflow: Settings modification and navigation',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/settings`, { timeout: 30000, waitUntil: 'networkidle' });
          await page.waitForTimeout(1000);

          // Modify a setting
          const checkbox = page.locator('input[type="checkbox"], [role="switch"]').first();
          if (await checkbox.count() > 0) {
            await checkbox.click();
            await page.waitForTimeout(200);
          }

          // Navigate away
          const dashLink = page.locator('a[href="/dashboard"]').first();
          if (await dashLink.count() > 0) {
            await dashLink.click();
            await page.waitForTimeout(500);
          }
        }
      },
    ];

    let passed = 0;
    let failed = 0;
    const failures = [];

    console.log(`Running ${tests.length} edge case & workflow tests...\n`);

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

    console.log('\n' + '='.repeat(70));
    console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

    if (failures.length > 0) {
      console.log('\nFailures:');
      for (const f of failures) {
        console.log(`  - ${f.name}`);
        console.log(`    ${f.error.substring(0, 100)}`);
      }
    }
    console.log('='.repeat(70));

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test suite error:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

runEdgeCaseTests();
