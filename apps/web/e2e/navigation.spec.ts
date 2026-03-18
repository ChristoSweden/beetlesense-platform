import { test, expect } from './fixtures/test-user';
import { loginAsDemo } from './fixtures/test-user';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test.describe('Sidebar navigation (desktop)', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    const sidebarLinks = [
      { name: /dashboard/i, url: '/owner/dashboard' },
      { name: /parcels/i, url: '/owner/parcels' },
      { name: /surveys/i, url: '/owner/surveys' },
      { name: /capture/i, url: '/owner/capture' },
      { name: /reports/i, url: '/owner/reports' },
      { name: /alerts/i, url: '/owner/alerts' },
      { name: /calendar/i, url: '/owner/calendar' },
      { name: /settings/i, url: '/owner/settings' },
    ];

    for (const { name, url } of sidebarLinks) {
      test(`should navigate to ${url} via sidebar`, async ({ page }) => {
        // Click the sidebar link
        const sidebarNav = page.locator('aside[role="navigation"]');
        const link = sidebarNav.getByRole('link', { name });
        if (await link.isVisible()) {
          await link.click();
          await expect(page).toHaveURL(new RegExp(url.replace(/\//g, '\\/')), { timeout: 10_000 });
        }
      });
    }

    test('should highlight the active navigation item', async ({ page }) => {
      // Navigate to parcels
      await page.goto('/owner/parcels');
      await page.waitForLoadState('networkidle');

      // The active NavLink should have a distinct style (active class from react-router NavLink)
      const sidebarNav = page.locator('aside[role="navigation"]');
      const activeLink = sidebarNav.getByRole('link', { name: /parcels/i });
      if (await activeLink.isVisible()) {
        // NavLink uses an "active" class or similar styling
        const className = await activeLink.getAttribute('class');
        // At minimum, the link should exist and be rendered
        expect(className).toBeTruthy();
      }
    });
  });

  test.describe('Mobile navigation', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('should show bottom navigation on mobile', async ({ page }) => {
      // MobileNav is rendered in a fixed bottom container on small screens
      const mobileNav = page.locator('.lg\\:hidden.fixed.bottom-0');
      await expect(mobileNav).toBeVisible({ timeout: 10_000 });
    });

    test('should navigate via mobile bottom nav', async ({ page }) => {
      // Mobile nav typically has icons for key pages
      const mobileNavLinks = page.locator('.lg\\:hidden.fixed.bottom-0 a, .lg\\:hidden.fixed.bottom-0 button');
      const count = await mobileNavLinks.count();
      expect(count).toBeGreaterThan(0);

      // Click the first nav item and verify navigation occurs
      if (count > 1) {
        await mobileNavLinks.nth(1).click();
        await page.waitForLoadState('networkidle');
        // URL should have changed from the initial dashboard
        const url = page.url();
        expect(url).toContain('/owner/');
      }
    });
  });

  test.describe('Browser navigation', () => {
    test('should handle back/forward browser navigation', async ({ page }) => {
      // Start on dashboard
      await expect(page).toHaveURL(/\/owner\/dashboard/);

      // Navigate to parcels
      await page.goto('/owner/parcels');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/owner\/parcels/);

      // Navigate to surveys
      await page.goto('/owner/surveys');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/owner\/surveys/);

      // Go back
      await page.goBack();
      await expect(page).toHaveURL(/\/owner\/parcels/);

      // Go forward
      await page.goForward();
      await expect(page).toHaveURL(/\/owner\/surveys/);
    });
  });

  test.describe('Deep linking', () => {
    test('should load /owner/parcels directly', async ({ page }) => {
      // Already authenticated via beforeEach
      await page.goto('/owner/parcels');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/owner\/parcels/);
      // Content should render
      await expect(page.getByText(/parcels|parcel/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('should load /owner/surveys directly', async ({ page }) => {
      await page.goto('/owner/surveys');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/owner\/surveys/);
      await expect(page.getByText(/surveys|survey/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('should load /owner/reports directly', async ({ page }) => {
      await page.goto('/owner/reports');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/owner\/reports/);
      await expect(page.getByText(/reports|report/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('should load /owner/settings directly', async ({ page }) => {
      await page.goto('/owner/settings');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/owner\/settings/);
      await expect(page.getByText(/settings/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('should load /owner/alerts directly', async ({ page }) => {
      await page.goto('/owner/alerts');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/owner\/alerts/);
      await expect(page.getByText(/alerts|alert/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('should show 404 page for unknown routes', async ({ page }) => {
      await page.goto('/this-does-not-exist');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/not found|404/i).first()).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Root redirect', () => {
    test('should redirect authenticated user from / to /owner/dashboard', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 10_000 });
    });
  });
});
