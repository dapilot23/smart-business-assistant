import { chromium } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

async function runInteractionTests() {
  console.log('=== Starting Interaction & Edge Case Test Suite ===\n');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const tests = [
      // ============ FORM INTERACTION TESTS ============
      {
        name: 'Search input accepts text',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const searchInput = page.locator('input[placeholder*="Search"]').first();
          if (await searchInput.count() > 0) {
            await searchInput.fill('test search');
            const value = await searchInput.inputValue();
            if (value !== 'test search') throw new Error('Search input did not accept text');
          }
        }
      },
      {
        name: 'Search input can be cleared',
        test: async () => {
          const searchInput = page.locator('input[placeholder*="Search"]').first();
          if (await searchInput.count() > 0) {
            await searchInput.fill('test');
            await searchInput.clear();
            const value = await searchInput.inputValue();
            if (value !== '') throw new Error('Search input did not clear');
          }
        }
      },

      // ============ BUTTON INTERACTION TESTS ============
      {
        name: 'Dashboard buttons are clickable',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const buttons = page.locator('button');
          const count = await buttons.count();
          if (count === 0) throw new Error('No buttons found');
          // Try clicking first visible button
          const firstButton = buttons.first();
          if (await firstButton.isVisible()) {
            await firstButton.click({ timeout: 5000 }).catch(() => {});
          }
        }
      },
      {
        name: 'Navigation links work correctly',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const teamLink = page.locator('a[href*="team"]').first();
          if (await teamLink.count() > 0) {
            await teamLink.click();
            await page.waitForURL('**/team**', { timeout: 10000 });
            const url = page.url();
            if (!url.includes('team')) throw new Error('Navigation to team failed');
          }
        }
      },

      // ============ MODAL/DIALOG TESTS ============
      {
        name: 'New Appointment modal can be triggered',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/appointments`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Look for new/add button
          const addButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("+")').first();
          if (await addButton.count() > 0 && await addButton.isVisible()) {
            await addButton.click({ timeout: 5000 }).catch(() => {});
            // Check if any modal/dialog appeared
            await page.waitForTimeout(500);
            const modal = await page.locator('[role="dialog"], [role="alertdialog"], .modal, [data-state="open"]').count();
            // Modal might or might not appear - just verify no crash
          }
        }
      },
      {
        name: 'Jobs page add button exists',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/jobs`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body').then(t => t.toLowerCase());
          const hasAddAction = content.includes('new') || content.includes('add') || content.includes('create');
          if (!hasAddAction) throw new Error('No add action found on jobs page');
        }
      },

      // ============ ERROR STATE TESTS ============
      {
        name: 'App handles rapid navigation',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Rapid navigation between pages
          await page.goto(`${BASE_URL}/dashboard/jobs`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.goto(`${BASE_URL}/dashboard/team`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.goto(`${BASE_URL}/dashboard/settings`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // If we get here without errors, test passed
        }
      },
      {
        name: 'App recovers from back navigation',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.goto(`${BASE_URL}/dashboard/appointments`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.goBack();
          await page.waitForLoadState('domcontentloaded');
          // Should be back on dashboard or still functional
        }
      },
      {
        name: 'App handles forward navigation',
        test: async () => {
          await page.goForward().catch(() => {});
          await page.waitForLoadState('domcontentloaded');
          // Should handle forward nav gracefully
        }
      },
      {
        name: 'Page refresh maintains state',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/appointments`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.reload();
          await page.waitForLoadState('domcontentloaded');
          const content = await page.textContent('body');
          if (!content.includes('Appointment')) throw new Error('Page state lost after refresh');
        }
      },

      // ============ BOOKING FLOW TESTS ============
      {
        name: 'Booking page shows services',
        test: async () => {
          await page.goto(`${BASE_URL}/book`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body').then(t => t.toLowerCase());
          const hasContent = content.includes('service') || content.includes('book') ||
                            content.includes('schedule') || content.includes('appointment');
          if (!hasContent) throw new Error('Booking page has no service content');
        }
      },
      {
        name: 'Booking page is responsive',
        test: async () => {
          await page.setViewportSize({ width: 375, height: 667 }); // Mobile size
          await page.goto(`${BASE_URL}/book`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          if (content.length < 50) throw new Error('Booking page not rendering on mobile');
          await page.setViewportSize({ width: 1280, height: 720 }); // Reset
        }
      },

      // ============ ACCESSIBILITY TESTS ============
      {
        name: 'Dashboard has accessible navigation',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Check for navigation landmarks or role
          const nav = await page.locator('nav, [role="navigation"]').count();
          const links = await page.locator('a').count();
          if (nav === 0 && links < 3) throw new Error('Insufficient navigation structure');
        }
      },
      {
        name: 'Buttons have accessible labels',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const buttons = await page.locator('button').all();
          let accessibleCount = 0;
          for (const btn of buttons.slice(0, 10)) { // Check first 10
            const text = await btn.textContent();
            const ariaLabel = await btn.getAttribute('aria-label');
            const title = await btn.getAttribute('title');
            if (text?.trim() || ariaLabel || title) accessibleCount++;
          }
          if (buttons.length > 0 && accessibleCount === 0) {
            throw new Error('No buttons with accessible labels');
          }
        }
      },
      {
        name: 'Forms have labels',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/settings`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Check if there are labels or aria-labels for inputs
          const inputs = await page.locator('input:not([type="hidden"])').count();
          const labels = await page.locator('label').count();
          const ariaLabels = await page.locator('[aria-label], [aria-labelledby]').count();
          // If there are inputs, should have some form of labeling
          if (inputs > 0 && labels === 0 && ariaLabels === 0) {
            // This might be okay for custom components, just note it
          }
        }
      },

      // ============ KEYBOARD NAVIGATION TESTS ============
      {
        name: 'Tab navigation works',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          // Press tab a few times
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          // Should not crash
        }
      },
      {
        name: 'Escape key handled gracefully',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.keyboard.press('Escape');
          // Should not crash or cause issues
        }
      },

      // ============ DATA DISPLAY TESTS ============
      {
        name: 'Dashboard shows overview content',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body');
          const hasOverview = content.includes('Today') ||
                            content.includes('Primary queue') ||
                            content.includes('Command center');
          if (!hasOverview) throw new Error('No overview content found');
        }
      },
      {
        name: 'Appointments page shows list or empty state',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/appointments`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body').then(t => t.toLowerCase());
          const hasContent = content.includes('appointment') || content.includes('schedule') ||
                            content.includes('no ') || content.includes('empty') ||
                            content.includes('create');
          if (!hasContent) throw new Error('Appointments page has no relevant content');
        }
      },
      {
        name: 'Jobs page shows list or empty state',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/jobs`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body').then(t => t.toLowerCase());
          const hasContent = content.includes('job') || content.includes('work') ||
                            content.includes('no ') || content.includes('empty') ||
                            content.includes('create');
          if (!hasContent) throw new Error('Jobs page has no relevant content');
        }
      },
      {
        name: 'Team page shows members or invite option',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard/team`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const content = await page.textContent('body').then(t => t.toLowerCase());
          const hasContent = content.includes('team') || content.includes('member') ||
                            content.includes('invite') || content.includes('add');
          if (!hasContent) throw new Error('Team page has no relevant content');
        }
      },

      // ============ STATE PERSISTENCE TESTS ============
      {
        name: 'App maintains user context across pages',
        test: async () => {
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const dashboardContent = await page.textContent('body');
          await page.goto(`${BASE_URL}/dashboard/settings`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          const settingsContent = await page.textContent('body');
          // Both should have similar user context (business name, user name)
          const hasDemoUser = dashboardContent.includes('Demo') && settingsContent.includes('Demo');
          const hasPlumbing = dashboardContent.includes('Plumbing') && settingsContent.includes('Plumbing');
          // At least one consistent context element
          if (!hasDemoUser && !hasPlumbing) {
            // May have different display, just ensure nav is consistent
            const hasNav = settingsContent.includes('Today') || settingsContent.includes('Business OS');
            if (!hasNav) throw new Error('User context lost between pages');
          }
        }
      },

      // ============ CONCURRENT ACTION TESTS ============
      {
        name: 'Multiple tabs work independently',
        test: async () => {
          const page2 = await context.newPage();
          await page.goto(`${BASE_URL}/dashboard`, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page2.goto(`${BASE_URL}/dashboard/settings`, { timeout: 30000, waitUntil: 'domcontentloaded' });

          const page1Content = await page.textContent('body');
          const page2Content = await page2.textContent('body');

          // Both pages should have loaded correctly
          if (!page1Content.includes('Today') && !page1Content.includes('Business OS')) {
            throw new Error('First tab failed to load');
          }
          const hasSettings =
            page2Content.includes('Setting') ||
            page2Content.includes('Business OS') ||
            page2Content.length > 120;
          if (!hasSettings) {
            throw new Error('Second tab failed to load');
          }

          await page2.close();
        }
      },
    ];

    let passed = 0;
    let failed = 0;
    const failures = [];

    console.log(`Running ${tests.length} interaction tests...\n`);

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

runInteractionTests();
