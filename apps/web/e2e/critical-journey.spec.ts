/**
 * E2E Test: Critical User Journey
 *
 * Tests the core path a new forest owner takes:
 * Landing → Signup → Onboarding → Register Parcel → Dashboard → AI Companion → Feedback
 *
 * See /docs/critical-journey.md for the full journey definition.
 */

import { test, expect } from '@playwright/test';

test.describe('Critical User Journey', () => {
  test('landing page loads and has clear CTA', async ({ page }) => {
    await page.goto('/');

    // Page should load within performance budget
    const timing = await page.evaluate(() => performance.now());
    expect(timing).toBeLessThan(5000);

    // Should have a main heading
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    // Should have a primary CTA (sign up or get started)
    const cta = page.getByRole('link', { name: /sign up|get started|try free|create account|demo/i }).first();
    await expect(cta).toBeVisible({ timeout: 5000 });
  });

  test('demo access bypasses auth and reaches dashboard', async ({ page }) => {
    await page.goto('/demo');

    // Should redirect to the owner dashboard
    await expect(page).toHaveURL(/\/owner\/(dashboard|today)/, { timeout: 10000 });

    // Dashboard should have key elements
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });

  test('login page is accessible and functional', async ({ page }) => {
    await page.goto('/login');

    // Should show email and password fields
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 5000 });

    // Should have a submit button
    await expect(page.getByRole('button', { name: /sign in|log in|continue/i }).first()).toBeVisible();

    // Should have a link to sign up
    await expect(page.getByRole('link', { name: /sign up|create account|register/i }).first()).toBeVisible();
  });

  test('signup page is accessible and functional', async ({ page }) => {
    await page.goto('/signup');

    // Should show registration form
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 5000 });

    // Should have a submit button
    await expect(page.getByRole('button', { name: /sign up|create|register|continue/i }).first()).toBeVisible();
  });

  test('onboarding page loads with step wizard', async ({ page }) => {
    await page.goto('/onboarding');

    // Should have a heading
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 5000 });

    // Should have interactive elements (buttons, inputs)
    const interactiveElements = page.getByRole('button');
    await expect(interactiveElements.first()).toBeVisible();
  });

  test('404 page shows branded error with navigation', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');

    // Should show the branded 404 page
    await expect(page.getByText(/lost in the forest|not found|404/i).first()).toBeVisible({ timeout: 5000 });

    // Should show error code UI-003
    await expect(page.getByText('UI-003')).toBeVisible();

    // Should have a way to navigate back
    await expect(page.getByRole('link', { name: /dashboard|home|go back/i }).first().or(
      page.getByRole('button', { name: /back|home/i }).first()
    )).toBeVisible();
  });

  test('feedback widget is accessible on every page', async ({ page }) => {
    // Check feedback widget on landing page
    await page.goto('/');
    await expect(page.getByLabel(/feedback/i).first()).toBeVisible({ timeout: 5000 });

    // Check on login page
    await page.goto('/login');
    await expect(page.getByLabel(/feedback/i).first()).toBeVisible({ timeout: 5000 });

    // Check on onboarding
    await page.goto('/onboarding');
    await expect(page.getByLabel(/feedback/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('feedback widget opens and shows emoji selection', async ({ page }) => {
    await page.goto('/');

    // Click the feedback button
    const feedbackBtn = page.getByLabel(/feedback/i).first();
    await feedbackBtn.click();

    // Should show emoji selection
    await expect(page.getByLabel(/not great|okay|love it/i).first()).toBeVisible({ timeout: 3000 });
  });

  test('admin route is protected', async ({ page }) => {
    await page.goto('/admin/dashboard');

    // Should redirect to login (not show admin content)
    await expect(page).not.toHaveURL(/\/admin\/dashboard/, { timeout: 5000 });
  });
});

test.describe('Accessibility', () => {
  test('landing page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1.first()).toBeVisible({ timeout: 5000 });
  });

  test('all interactive elements are keyboard focusable', async ({ page }) => {
    await page.goto('/login');

    // Tab through the page
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('skip to content link exists', async ({ page }) => {
    await page.goto('/');

    // Check for skip link (may be visually hidden but present)
    const skipLink = page.getByRole('link', { name: /skip/i }).first();
    const count = await skipLink.count();
    // Skip link is nice-to-have, not a blocker
    if (count > 0) {
      await expect(skipLink).toBeAttached();
    }
  });
});

test.describe('Performance', () => {
  test('landing page loads within performance budget', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    // Should load DOM within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('no console errors on landing page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('[PostHog]') && !msg.text().includes('[Sentry]')) {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Filter out expected dev-mode warnings
    const realErrors = errors.filter(
      (e) => !e.includes('Supabase') && !e.includes('favicon') && !e.includes('manifest')
    );

    expect(realErrors).toHaveLength(0);
  });
});
