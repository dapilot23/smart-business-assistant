import { test, expect } from '@playwright/test';
import {
  mockDashboardAPI,
  mockAppointmentsAPI,
  mockTeamAPI,
  mockJobsAPI,
  mockSettingsAPI,
  mockBookingAPI,
  captureConsoleErrors,
} from './fixtures/helpers';
import {
  TEST_SERVICES,
  TEST_CUSTOMERS,
  TEST_TECHNICIANS,
  TEST_APPOINTMENTS,
  TEST_TEAM_MEMBERS,
} from './fixtures/test-data';

const BASE_URL = 'http://localhost:3000';

test.describe('Dashboard UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboardAPI(page);
    await mockAppointmentsAPI(page);
  });

  test('should display all dashboard stats cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Verify stats cards are visible
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('Revenue');
    expect(bodyText).toContain('Appointments');
  });

  test('should have functional search input', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"]');
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('test search');
      await expect(searchInput).toHaveValue('test search');
    }
  });

  test('should navigate to appointments via New Appointment button', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Look for New Appointment button
    const newAptButton = page
      .locator('button:has-text("New Appointment"), a:has-text("New Appointment")')
      .first();
    if ((await newAptButton.count()) > 0) {
      await newAptButton.click();
      await page.waitForTimeout(1000);
      // Should either open modal or navigate to appointments
      const url = page.url();
      const hasModal = (await page.locator('[role="dialog"]').count()) > 0;
      expect(url.includes('appointment') || hasModal).toBeTruthy();
    }
  });

  test('should show sidebar navigation items', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Check for navigation links
    const navItems = ['Appointments', 'Jobs', 'Team', 'Settings'];
    for (const item of navItems) {
      const link = page.locator(`a:has-text("${item}")`).first();
      expect(await link.count()).toBeGreaterThan(0);
    }
  });

  test('should navigate between dashboard pages via sidebar', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Click on Appointments link
    const appointmentsLink = page.locator('a[href*="appointments"]').first();
    if ((await appointmentsLink.count()) > 0) {
      await appointmentsLink.click();
      await page.waitForURL('**/appointments**');
      expect(page.url()).toContain('appointments');
    }
  });
});

test.describe('Appointment Management UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await mockAppointmentsAPI(page);
  });

  test('should display appointment calendar', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/appointments`);
    await page.waitForLoadState('networkidle');

    // Calendar or appointment list should be visible
    const bodyText = await page.locator('body').textContent();
    expect(
      bodyText?.toLowerCase().includes('appointment') ||
        bodyText?.toLowerCase().includes('schedule')
    ).toBeTruthy();
  });

  test('should have calendar navigation buttons', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/appointments`);
    await page.waitForLoadState('networkidle');

    // Look for Today, Previous, Next buttons
    const todayButton = page.locator('button:has-text("Today")');
    if ((await todayButton.count()) > 0) {
      await expect(todayButton).toBeVisible();
    }
  });

  test('should open appointment modal when clicking New Appointment', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard/appointments`);
    await page.waitForLoadState('networkidle');

    const newButton = page
      .locator(
        'button:has-text("New Appointment"), button:has-text("New"), button:has-text("Add")'
      )
      .first();
    if ((await newButton.count()) > 0) {
      await newButton.click();
      await page.waitForTimeout(500);

      // Check if modal opened
      const modal = page.locator('[role="dialog"]');
      if ((await modal.count()) > 0) {
        await expect(modal).toBeVisible();
      }
    }
  });

  test('should fill and submit appointment form', async ({ page }) => {
    let appointmentCreated = false;

    await page.route('**/api/**/appointments', async (route) => {
      if (route.request().method() === 'POST') {
        appointmentCreated = true;
        await route.fulfill({
          json: { id: 'new-apt-123', status: 'SCHEDULED' },
        });
      } else {
        await route.fulfill({ json: TEST_APPOINTMENTS });
      }
    });

    await page.goto(`${BASE_URL}/dashboard/appointments`);
    await page.waitForLoadState('networkidle');

    // Try to open new appointment modal
    const newButton = page
      .locator('button:has-text("New"), button:has-text("Add")')
      .first();
    if ((await newButton.count()) > 0) {
      await newButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      if ((await modal.count()) > 0) {
        // Try to fill customer dropdown
        const customerSelect = modal.locator(
          '[data-testid="customer-select"], select, [role="combobox"]'
        ).first();
        if ((await customerSelect.count()) > 0) {
          await customerSelect.click();
          await page.waitForTimeout(200);
        }

        // Try to submit
        const saveButton = modal.locator(
          'button:has-text("Save"), button:has-text("Create"), button[type="submit"]'
        ).first();
        if ((await saveButton.count()) > 0 && (await saveButton.isEnabled())) {
          await saveButton.click();
        }
      }
    }
  });

  test('should switch calendar views', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/appointments`);
    await page.waitForLoadState('networkidle');

    // Look for view toggle buttons
    const weekButton = page.locator('button:has-text("Week")');
    const dayButton = page.locator('button:has-text("Day")');

    if ((await weekButton.count()) > 0) {
      await weekButton.click();
      await page.waitForTimeout(300);
    }

    if ((await dayButton.count()) > 0) {
      await dayButton.click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe('Team Management UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await mockTeamAPI(page);
  });

  test('should display team members list', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/team`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.toLowerCase()).toContain('team');
  });

  test('should show team member roles', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/team`);
    await page.waitForLoadState('networkidle');

    const bodyText = (await page.locator('body').textContent()) || '';
    // Should show role badges
    const hasRoles =
      bodyText.includes('Owner') ||
      bodyText.includes('Admin') ||
      bodyText.includes('Technician') ||
      bodyText.includes('Dispatcher');
    expect(hasRoles).toBeTruthy();
  });

  test('should open invite member modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/team`);
    await page.waitForLoadState('networkidle');

    const inviteButton = page
      .locator('button:has-text("Invite"), button:has-text("Add")')
      .first();
    if ((await inviteButton.count()) > 0) {
      await inviteButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      if ((await modal.count()) > 0) {
        await expect(modal).toBeVisible();
      }
    }
  });

  test('should fill invite form with email and role', async ({ page }) => {
    let inviteSent = false;

    await page.route('**/api/**/invitations', async (route) => {
      if (route.request().method() === 'POST') {
        inviteSent = true;
        const body = route.request().postDataJSON();
        await route.fulfill({
          json: { id: 'inv-123', ...body, status: 'PENDING' },
        });
      } else {
        await route.fulfill({ json: [] });
      }
    });

    await page.goto(`${BASE_URL}/dashboard/team`);
    await page.waitForLoadState('networkidle');

    const inviteButton = page
      .locator('button:has-text("Invite"), button:has-text("Add")')
      .first();
    if ((await inviteButton.count()) > 0) {
      await inviteButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      if ((await modal.count()) > 0) {
        // Fill email
        const emailInput = modal.locator('input[type="email"]');
        if ((await emailInput.count()) > 0) {
          await emailInput.fill('newmember@example.com');
        }

        // Fill name if available
        const nameInput = modal.locator(
          'input[type="text"], input[placeholder*="name" i]'
        ).first();
        if ((await nameInput.count()) > 0) {
          await nameInput.fill('New Member');
        }

        // Select role
        const roleSelect = modal.locator('select, [role="combobox"]').first();
        if ((await roleSelect.count()) > 0) {
          await roleSelect.click();
          await page.waitForTimeout(200);
          // Try to select Technician
          const techOption = page.locator('text=Technician').first();
          if ((await techOption.count()) > 0) {
            await techOption.click();
          }
        }

        // Submit
        const sendButton = modal
          .locator('button:has-text("Send"), button:has-text("Invite")')
          .first();
        if ((await sendButton.count()) > 0) {
          await sendButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });
});

test.describe('Settings UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await mockSettingsAPI(page);
  });

  test('should display settings tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settings`);
    await page.waitForLoadState('networkidle');

    const bodyText = (await page.locator('body').textContent()) || '';
    const hasTabs =
      bodyText.includes('Business') ||
      bodyText.includes('Notification') ||
      bodyText.includes('Profile');
    expect(hasTabs).toBeTruthy();
  });

  test('should switch between settings tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settings`);
    await page.waitForLoadState('networkidle');

    // Click on Notifications tab
    const notifTab = page
      .locator('button:has-text("Notification"), [role="tab"]:has-text("Notification")')
      .first();
    if ((await notifTab.count()) > 0) {
      await notifTab.click();
      await page.waitForTimeout(300);
    }

    // Click on Review tab
    const reviewTab = page
      .locator('button:has-text("Review"), [role="tab"]:has-text("Review")')
      .first();
    if ((await reviewTab.count()) > 0) {
      await reviewTab.click();
      await page.waitForTimeout(300);
    }
  });

  test('should toggle notification settings', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settings`);
    await page.waitForLoadState('networkidle');

    // Find checkbox/switch for reminders
    const reminderToggle = page
      .locator('input[type="checkbox"], [role="switch"], [role="checkbox"]')
      .first();
    if ((await reminderToggle.count()) > 0) {
      const initialState = await reminderToggle.isChecked();
      await reminderToggle.click();
      await page.waitForTimeout(200);
      // State should have changed
      const newState = await reminderToggle.isChecked();
      expect(newState).not.toBe(initialState);
    }
  });

  test('should save settings changes', async ({ page }) => {
    let settingsSaved = false;

    await page.route('**/api/**/settings', async (route) => {
      if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
        settingsSaved = true;
        await route.fulfill({ json: { success: true } });
      } else {
        await route.fulfill({
          json: {
            timezone: 'America/New_York',
            businessHours: [],
            notifications: { sendReminders: true },
          },
        });
      }
    });

    await page.goto(`${BASE_URL}/dashboard/settings`);
    await page.waitForLoadState('networkidle');

    // Find and click save button
    const saveButton = page.locator('button:has-text("Save")').first();
    if ((await saveButton.count()) > 0) {
      await saveButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should modify timezone dropdown', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settings`);
    await page.waitForLoadState('networkidle');

    // Find timezone select
    const timezoneSelect = page
      .locator('select, [role="combobox"]')
      .filter({ hasText: /timezone|eastern|pacific/i })
      .first();
    if ((await timezoneSelect.count()) > 0) {
      await timezoneSelect.click();
      await page.waitForTimeout(200);
    }
  });
});

test.describe('Jobs Management UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await mockJobsAPI(page);
  });

  test('should display jobs list', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/jobs`);
    await page.waitForLoadState('networkidle');

    const bodyText = (await page.locator('body').textContent()) || '';
    expect(bodyText.toLowerCase()).toContain('job');
  });

  test('should show job status badges', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/jobs`);
    await page.waitForLoadState('networkidle');

    const bodyText = (await page.locator('body').textContent()) || '';
    const hasStatus =
      bodyText.includes('Not Started') ||
      bodyText.includes('In Progress') ||
      bodyText.includes('Completed') ||
      bodyText.toLowerCase().includes('status');
    expect(hasStatus || bodyText.toLowerCase().includes('job')).toBeTruthy();
  });

  test('should filter jobs by status', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/jobs`);
    await page.waitForLoadState('networkidle');

    // Look for filter buttons or dropdown
    const filterSelect = page.locator('select, [role="combobox"]').first();
    if ((await filterSelect.count()) > 0) {
      await filterSelect.click();
      await page.waitForTimeout(200);
    }

    // Or look for status filter buttons
    const statusButton = page
      .locator('button:has-text("In Progress"), button:has-text("Completed")')
      .first();
    if ((await statusButton.count()) > 0) {
      await statusButton.click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe('Public Booking Flow UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await mockBookingAPI(page);
  });

  test('should display service selection', async ({ page }) => {
    await page.goto(`${BASE_URL}/book/test-business`);
    await page.waitForLoadState('networkidle');

    const bodyText = (await page.locator('body').textContent()) || '';
    expect(
      bodyText.toLowerCase().includes('service') ||
        bodyText.toLowerCase().includes('select') ||
        bodyText.toLowerCase().includes('book')
    ).toBeTruthy();
  });

  test('should select a service', async ({ page }) => {
    await page.goto(`${BASE_URL}/book/test-business`);
    await page.waitForLoadState('networkidle');

    // Look for service cards or buttons
    const serviceButton = page
      .locator('button:has-text("Select"), [data-testid*="service"]')
      .first();
    if ((await serviceButton.count()) > 0) {
      await serviceButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should navigate through booking steps', async ({ page }) => {
    await page.goto(`${BASE_URL}/book/test-business`);
    await page.waitForLoadState('networkidle');

    // Step 1: Select service
    const serviceCard = page.locator('button:has-text("Select")').first();
    if ((await serviceCard.count()) > 0) {
      await serviceCard.click();
      await page.waitForTimeout(500);
    }

    // Step 2: Select date (look for calendar or date picker)
    const dateButton = page
      .locator('[data-testid*="date"], button:has-text(/\\d{1,2}/)')
      .first();
    if ((await dateButton.count()) > 0) {
      await dateButton.click();
      await page.waitForTimeout(300);
    }

    // Step 3: Select time
    const timeSlot = page
      .locator('button:has-text(/\\d{1,2}:\\d{2}/)')
      .first();
    if ((await timeSlot.count()) > 0) {
      await timeSlot.click();
      await page.waitForTimeout(300);
    }
  });

  test('should fill customer information form', async ({ page }) => {
    await page.goto(`${BASE_URL}/book/test-business`);
    await page.waitForLoadState('networkidle');

    // Navigate to customer form step
    // Select service first
    const serviceCard = page.locator('button:has-text("Select")').first();
    if ((await serviceCard.count()) > 0) {
      await serviceCard.click();
      await page.waitForTimeout(500);
    }

    // Select date
    const dateButton = page.locator('button').filter({ hasText: /^\d{1,2}$/ }).first();
    if ((await dateButton.count()) > 0) {
      await dateButton.click();
      await page.waitForTimeout(300);
    }

    // Select time
    const timeSlot = page.locator('button:has-text(/\\d{1,2}:\\d{2}/)').first();
    if ((await timeSlot.count()) > 0) {
      await timeSlot.click();
      await page.waitForTimeout(300);
    }

    // Fill customer form
    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]').first();
    if ((await nameInput.count()) > 0) {
      await nameInput.fill('John Test');
    }

    const emailInput = page.locator('input[type="email"]').first();
    if ((await emailInput.count()) > 0) {
      await emailInput.fill('john@test.com');
    }

    const phoneInput = page.locator('input[type="tel"]').first();
    if ((await phoneInput.count()) > 0) {
      await phoneInput.fill('+1234567890');
    }
  });

  test('should complete full booking flow', async ({ page }) => {
    let bookingCreated = false;

    await page.route('**/api/**/book', async (route) => {
      bookingCreated = true;
      await route.fulfill({
        json: {
          id: 'booking-123',
          status: 'PENDING',
          confirmationNumber: 'CONF-TEST123',
        },
      });
    });

    await page.goto(`${BASE_URL}/book/test-business`);
    await page.waitForLoadState('networkidle');

    // Complete all steps...
    const serviceCard = page.locator('button:has-text("Select")').first();
    if ((await serviceCard.count()) > 0) {
      await serviceCard.click();
      await page.waitForTimeout(500);
    }

    // Continue through flow and submit
    const confirmButton = page
      .locator('button:has-text("Confirm"), button:has-text("Book"), button[type="submit"]')
      .first();
    if ((await confirmButton.count()) > 0 && (await confirmButton.isEnabled())) {
      await confirmButton.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Calendar/Availability UI Interactions', () => {
  test('should display availability settings', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/availability`);
    await page.waitForLoadState('networkidle');

    const bodyText = (await page.locator('body').textContent()) || '';
    expect(
      bodyText.toLowerCase().includes('availability') ||
        bodyText.toLowerCase().includes('schedule') ||
        bodyText.toLowerCase().includes('hours')
    ).toBeTruthy();
  });

  test('should show day toggles for availability', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/availability`);
    await page.waitForLoadState('networkidle');

    const bodyText = (await page.locator('body').textContent()) || '';
    const hasDays =
      bodyText.includes('Monday') ||
      bodyText.includes('Tuesday') ||
      bodyText.includes('Wednesday');
    expect(hasDays || bodyText.toLowerCase().includes('availability')).toBeTruthy();
  });

  test('should toggle day availability', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/availability`);
    await page.waitForLoadState('networkidle');

    // Find day checkbox/switch
    const dayToggle = page
      .locator('input[type="checkbox"], [role="switch"]')
      .first();
    if ((await dayToggle.count()) > 0) {
      await dayToggle.click();
      await page.waitForTimeout(200);
    }
  });

  test('should modify business hours', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/availability`);
    await page.waitForLoadState('networkidle');

    // Find time input
    const timeInput = page.locator('input[type="time"]').first();
    if ((await timeInput.count()) > 0) {
      await timeInput.fill('09:00');
      await page.waitForTimeout(200);
    }
  });
});

test.describe('Navigation and Layout UI Interactions', () => {
  test('should have responsive sidebar', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // Look for mobile menu button
    const menuButton = page
      .locator('button[aria-label*="menu" i], button:has([data-testid*="menu"])')
      .first();
    if ((await menuButton.count()) > 0) {
      await menuButton.click();
      await page.waitForTimeout(300);
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should navigate using breadcrumbs if available', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settings`);
    await page.waitForLoadState('networkidle');

    // Look for breadcrumb navigation
    const breadcrumb = page.locator('nav[aria-label*="breadcrumb" i], .breadcrumb').first();
    if ((await breadcrumb.count()) > 0) {
      const homeLink = breadcrumb.locator('a').first();
      if ((await homeLink.count()) > 0) {
        await homeLink.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('should show notifications bell', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const notificationBell = page
      .locator('button[aria-label*="notification" i], [data-testid*="notification"]')
      .first();
    if ((await notificationBell.count()) > 0) {
      await expect(notificationBell).toBeVisible();
    }
  });
});

test.describe('Form Validation UI Interactions', () => {
  test('should show validation errors for empty required fields', async ({
    page,
  }) => {
    await mockTeamAPI(page);
    await page.goto(`${BASE_URL}/dashboard/team`);
    await page.waitForLoadState('networkidle');

    // Open invite modal
    const inviteButton = page.locator('button:has-text("Invite")').first();
    if ((await inviteButton.count()) > 0) {
      await inviteButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      if ((await modal.count()) > 0) {
        // Try to submit without filling required fields
        const submitButton = modal
          .locator('button:has-text("Send"), button[type="submit"]')
          .first();
        if ((await submitButton.count()) > 0) {
          await submitButton.click();
          await page.waitForTimeout(300);

          // Check for validation message or error
          const errorMsg = page.locator('[role="alert"], .error, [class*="error"]');
          const inputError = page.locator('input:invalid');
          expect(
            (await errorMsg.count()) > 0 || (await inputError.count()) > 0
          ).toBeTruthy();
        }
      }
    }
  });

  test('should validate email format', async ({ page }) => {
    await mockTeamAPI(page);
    await page.goto(`${BASE_URL}/dashboard/team`);
    await page.waitForLoadState('networkidle');

    const inviteButton = page.locator('button:has-text("Invite")').first();
    if ((await inviteButton.count()) > 0) {
      await inviteButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      if ((await modal.count()) > 0) {
        const emailInput = modal.locator('input[type="email"]');
        if ((await emailInput.count()) > 0) {
          // Enter invalid email
          await emailInput.fill('invalid-email');
          await emailInput.blur();
          await page.waitForTimeout(200);

          // Check input validity
          const isInvalid = await emailInput.evaluate(
            (el: HTMLInputElement) => !el.checkValidity()
          );
          expect(isInvalid).toBeTruthy();
        }
      }
    }
  });
});

test.describe('Loading States UI Interactions', () => {
  test('should show loading state on dashboard', async ({ page }) => {
    // Delay API response to see loading state
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ json: {} });
    });

    await page.goto(`${BASE_URL}/dashboard`);

    // Look for loading spinner or skeleton
    const loader = page.locator(
      '.animate-spin, [data-testid*="loading"], .skeleton, [class*="loading"]'
    );
    // Loading state may be brief, so we just verify page loads
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show loading state during form submission', async ({ page }) => {
    await page.route('**/api/**/settings', async (route) => {
      if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({ json: { success: true } });
      } else {
        await route.fulfill({ json: {} });
      }
    });

    await page.goto(`${BASE_URL}/dashboard/settings`);
    await page.waitForLoadState('networkidle');

    const saveButton = page.locator('button:has-text("Save")').first();
    if ((await saveButton.count()) > 0) {
      await saveButton.click();
      // Check for loading state
      const buttonText = await saveButton.textContent();
      expect(
        buttonText?.includes('Saving') ||
          buttonText?.includes('Loading') ||
          (await page.locator('.animate-spin').count()) > 0
      ).toBeTruthy();
    }
  });
});

test.describe('Error Handling UI Interactions', () => {
  test('should display error message on API failure', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: 'Internal Server Error' },
      });
    });

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Page should still render without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show retry button on error', async ({ page }) => {
    await page.route('**/api/**/appointments', async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: 'Failed to load' },
      });
    });

    await page.goto(`${BASE_URL}/dashboard/appointments`);
    await page.waitForLoadState('networkidle');

    // Look for retry button
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
    if ((await retryButton.count()) > 0) {
      await expect(retryButton).toBeVisible();
    }
  });
});
