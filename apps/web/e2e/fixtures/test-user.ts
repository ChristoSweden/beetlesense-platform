import { test as base, type Page } from '@playwright/test';

/**
 * Demo user credentials used for E2E testing.
 * These work with the "Skip login (demo mode)" flow built into the app,
 * so no real Supabase backend is needed.
 */
export const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@beetlesense.com',
  fullName: 'Demo User',
  role: 'owner' as const,
  password: 'not-needed-for-demo',
};

export const TEST_USER = {
  email: 'e2e-test@beetlesense.com',
  password: 'TestPassword123!',
  fullName: 'E2E Test User',
  role: 'owner' as const,
};

/**
 * Authenticate by clicking the "Skip login (demo mode)" button.
 * This sets demo state in the Zustand auth store without requiring Supabase.
 */
export async function loginAsDemo(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByText('Skip login (demo mode)').click();
  // Wait for redirect to owner dashboard
  await page.waitForURL('**/owner/dashboard', { timeout: 15_000 });
}

/**
 * Extended test fixture that provides an already-authenticated page.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await loginAsDemo(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
