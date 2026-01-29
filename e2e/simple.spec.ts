import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  expect(true).toBe(true);
});
