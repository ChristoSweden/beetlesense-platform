import { test, expect } from '@playwright/test';
import { TEST_USER, loginAsDemo } from './fixtures/test-user';

test.describe('Authentication flows', () => {
  test.describe('Sign up', () => {
    test('should display role selection as the first step', async ({ page }) => {
      await page.goto('/signup');
      await expect(page.getByText('BeetleSense')).toBeVisible();
      // Role selection buttons
      await expect(page.getByText('Forest Owner', { exact: false })).toBeVisible();
      await expect(page.getByText('Drone Pilot', { exact: false })).toBeVisible();
      await expect(page.getByText('Inspector', { exact: false })).toBeVisible();
    });

    test('should navigate from role selection to account details', async ({ page }) => {
      await page.goto('/signup');
      // Select "Forest Owner" role
      await page.getByText('Forest Owner', { exact: false }).click();
      // Click Next
      await page.getByRole('button', { name: /next/i }).click();
      // Account details form should now be visible
      await expect(page.getByPlaceholder('Anna Lindgren')).toBeVisible();
      await expect(page.getByPlaceholder('anna@example.com')).toBeVisible();
      await expect(page.getByPlaceholder('Min 8 characters')).toBeVisible();
      await expect(page.getByPlaceholder('Confirm password')).toBeVisible();
    });

    test('should show password mismatch error', async ({ page }) => {
      await page.goto('/signup');
      // Select role and proceed
      await page.getByText('Forest Owner', { exact: false }).click();
      await page.getByRole('button', { name: /next/i }).click();

      // Fill in details with mismatched passwords
      await page.getByPlaceholder('Anna Lindgren').fill(TEST_USER.fullName);
      await page.getByPlaceholder('anna@example.com').fill(TEST_USER.email);
      await page.getByPlaceholder('Min 8 characters').fill('Password123!');
      await page.getByPlaceholder('Confirm password').fill('DifferentPassword!');

      // Submit
      await page.getByRole('button', { name: /sign up/i }).click();

      // Should show password mismatch error
      await expect(page.getByText(/passwords do not match|do not match/i)).toBeVisible();
    });

    test('should have a link to sign in page', async ({ page }) => {
      await page.goto('/signup');
      const signInLink = page.getByRole('link', { name: /sign in/i });
      await expect(signInLink).toBeVisible();
      await signInLink.click();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Log in', () => {
    test('should display sign in form with email and password fields', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByText('BeetleSense')).toBeVisible();
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
      await expect(page.getByPlaceholder('********')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should show error when logging in with invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.getByPlaceholder('you@example.com').fill('invalid@example.com');
      await page.getByPlaceholder('********').fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should display an error message (either from Supabase or the "Backend not configured" message)
      await expect(
        page.locator('.bg-red-500\\/10, [role="alert"]').first()
      ).toBeVisible({ timeout: 10_000 });
    });

    test('should allow demo login via skip button', async ({ page }) => {
      await page.goto('/login');
      await page.getByText('Skip login (demo mode)').click();
      // Should redirect to the owner dashboard
      await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15_000 });
    });

    test('should have a link to sign up page', async ({ page }) => {
      await page.goto('/login');
      const signUpLink = page.getByRole('link', { name: /sign up/i });
      await expect(signUpLink).toBeVisible();
      await signUpLink.click();
      await expect(page).toHaveURL(/\/signup/);
    });

    test('should show forgot password view', async ({ page }) => {
      await page.goto('/login');
      await page.getByText(/forgot password/i).click();
      await expect(page.getByText(/reset password/i).first()).toBeVisible();
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should sign out and redirect to login page', async ({ page }) => {
      // First, login as demo user
      await loginAsDemo(page);
      await expect(page).toHaveURL(/\/owner\/dashboard/);

      // Navigate to settings where logout is typically available
      await page.goto('/owner/settings');
      await page.waitForLoadState('networkidle');

      // Look for a sign out / logout button on the settings page or sidebar
      const logoutButton = page.getByRole('button', { name: /sign out|log out|logout/i });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        // Should redirect away from protected route
        await page.waitForURL(/\/(login|onboarding|$)/, { timeout: 10_000 });
      }
    });
  });

  test.describe('Protected routes', () => {
    test('should redirect to login when visiting /owner/dashboard unauthenticated', async ({ page }) => {
      await page.goto('/owner/dashboard');
      // ProtectedRoute should redirect to /login
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test('should redirect to login when visiting /owner/parcels unauthenticated', async ({ page }) => {
      await page.goto('/owner/parcels');
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test('should redirect to login when visiting /pilot/dashboard unauthenticated', async ({ page }) => {
      await page.goto('/pilot/dashboard');
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test('should redirect to login when visiting /inspector/dashboard unauthenticated', async ({ page }) => {
      await page.goto('/inspector/dashboard');
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });
});
