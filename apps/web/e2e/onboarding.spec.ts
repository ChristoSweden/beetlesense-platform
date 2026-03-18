import { test, expect } from '@playwright/test';

test.describe('Onboarding flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding');
  });

  test('should render the onboarding page with property lookup', async ({ page }) => {
    // Title and subtitle
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Property ID input
    await expect(page.locator('#fastighets-id')).toBeVisible();
    // Find My Forest button
    await expect(page.getByRole('button', { name: /find my forest/i })).toBeVisible();
    // Format hint
    await expect(page.getByText(/county municipality block/i)).toBeVisible();
  });

  test('should show example property buttons', async ({ page }) => {
    await expect(page.getByText('Kronoberg Vaxjo 1:23')).toBeVisible();
    await expect(page.getByText('Jonkoping Varnamo 5:12')).toBeVisible();
  });

  test('should fill input when clicking an example property', async ({ page }) => {
    await page.getByText('Kronoberg Vaxjo 1:23').click();
    await expect(page.locator('#fastighets-id')).toHaveValue('Kronoberg Vaxjo 1:23');
  });

  test('should show validation error for invalid property format', async ({ page }) => {
    await page.locator('#fastighets-id').fill('invalid-format');
    await page.getByRole('button', { name: /find my forest/i }).click();
    // Should show format error
    await expect(page.getByRole('alert').or(page.getByText(/invalid format/i))).toBeVisible({
      timeout: 5_000,
    });
  });

  test('should complete the property lookup flow with a valid ID', async ({ page }) => {
    // Fill in a valid-format property ID
    await page.getByText('Kronoberg Vaxjo 1:23').click();
    await page.getByRole('button', { name: /find my forest/i }).click();

    // Should transition to loading step (progress loader)
    await expect(page.getByText(/looking up|loading|fetching|cadastral/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Eventually should show the result step with forest data
    await expect(
      page.getByText(/create.*free.*account|sign up|try another/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test('should allow trying another property after viewing results', async ({ page }) => {
    // Complete a lookup first
    await page.getByText('Kronoberg Vaxjo 1:23').click();
    await page.getByRole('button', { name: /find my forest/i }).click();

    // Wait for results
    await expect(
      page.getByText(/try another property/i)
    ).toBeVisible({ timeout: 30_000 });

    // Click "Try another property"
    await page.getByText(/try another property/i).click();

    // Should go back to input step
    await expect(page.locator('#fastighets-id')).toBeVisible();
  });

  test('should have navigation links to sign in and sign up', async ({ page }) => {
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('should navigate to sign up from result CTA', async ({ page }) => {
    // Complete lookup
    await page.getByText('Kronoberg Vaxjo 1:23').click();
    await page.getByRole('button', { name: /find my forest/i }).click();

    // Wait for result with CTA
    const signUpCTA = page.getByRole('link', { name: /create.*free.*account/i });
    await expect(signUpCTA).toBeVisible({ timeout: 30_000 });

    await signUpCTA.click();
    await expect(page).toHaveURL(/\/signup/);
  });
});
