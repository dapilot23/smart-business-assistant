import { chromium } from '@playwright/test';

async function run() {
  console.log('Starting browser...');
  const browser = await chromium.launch({ headless: true });
  console.log('Browser launched');
  const page = await browser.newPage();
  console.log('New page created');

  try {
    console.log('Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { timeout: 30000 });
    console.log('Page loaded');
    const title = await page.title();
    console.log('Page title:', title);
    console.log('TEST PASSED');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

run();
