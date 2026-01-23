import { test, expect } from '@playwright/test';

test('homepage has correct title and links', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Smart Business Assistant/);

  const heading = page.getByRole('heading', { name: 'Smart Business Assistant' });
  await expect(heading).toBeVisible();

  const loginLink = page.getByRole('link', { name: 'Log In' });
  await expect(loginLink).toBeVisible();

  const signupLink = page.getByRole('link', { name: 'Sign Up' });
  await expect(signupLink).toBeVisible();
});

test('navigation to login page works', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Log In' }).click();

  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('navigation to signup page works', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Sign Up' }).click();

  await expect(page).toHaveURL('/signup');
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
});
