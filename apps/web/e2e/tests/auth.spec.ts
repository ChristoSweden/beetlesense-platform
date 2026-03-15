import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect, TEST_USERS } from '../fixtures/auth.fixture';

test.describe('Authentication flows', () => {
  test('magic link signup: shows confirmation after email submit', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/signup`);

    // Fill out signup form
    await page.getByLabel(/e-post|email/i).fill('new-user@example.test');
    await page.getByLabel(/namn|name/i).fill('Ny Användare');

    // Select role
    await page.getByRole('radio', { name: /skogsägare|forest owner/i }).check();

    // Submit
    await page.getByRole('button', { name: /skapa konto|sign up|create account/i }).click();

    // Should show magic link confirmation screen
    await expect(
      page.getByText(/kontrollera din e-post|check your email|magic link/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('password login for pilot role', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/login`);

    await page.getByLabel(/e-post|email/i).fill(TEST_USERS.pilot.email);
    await page.getByLabel(/lösenord|password/i).fill(TEST_USERS.pilot.password);
    await page.getByRole('button', { name: /logga in|log in|sign in/i }).click();

    // Should redirect to pilot dashboard or application form
    await page.waitForURL(/(\/pilot|\/dashboard)/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/pilot/);
  });

  test('role-based routing: owner cannot access /pilot/* routes', async ({ page, baseURL }) => {
    // First login as owner
    await page.goto(`${baseURL}/login`);
    await page.getByLabel(/e-post|email/i).fill(TEST_USERS.owner.email);
    await page.getByLabel(/lösenord|password/i).fill(TEST_USERS.owner.password);
    await page.getByRole('button', { name: /logga in|log in|sign in/i }).click();

    await page.waitForURL(/\/owner|\/dashboard/, { timeout: 15_000 });

    // Try navigating to pilot routes
    await page.goto(`${baseURL}/pilot/jobs`);

    // Should be redirected away or see access denied
    await expect(page).not.toHaveURL(/\/pilot\/jobs/);
  });

  test('session persists after page refresh', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/login`);
    await page.getByLabel(/e-post|email/i).fill(TEST_USERS.owner.email);
    await page.getByLabel(/lösenord|password/i).fill(TEST_USERS.owner.password);
    await page.getByRole('button', { name: /logga in|log in|sign in/i }).click();

    await page.waitForURL(/\/owner|\/dashboard/, { timeout: 15_000 });
    const urlBeforeRefresh = page.url();

    // Refresh
    await page.reload({ waitUntil: 'networkidle' });

    // Should still be on the same authenticated page (not redirected to login)
    await expect(page).not.toHaveURL(/\/login|\/signup/);
    // Should still show user elements (sidebar/nav with user name or avatar)
    await expect(
      page.getByText(new RegExp(TEST_USERS.owner.fullName.split(' ')[0], 'i')),
    ).toBeVisible({ timeout: 10_000 });
  });
});
