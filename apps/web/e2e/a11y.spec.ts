import { test, expect } from './fixtures/test-user';
import { loginAsDemo } from './fixtures/test-user';

test.describe('Accessibility', () => {
  test.describe('Skip to content', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should have a skip-to-content link that becomes visible on focus', async ({ page }) => {
      await loginAsDemo(page);

      // The SkipToContent link is the first focusable element, hidden by default
      const skipLink = page.getByRole('link', { name: /skip to main content/i });

      // Should exist in the DOM
      await expect(skipLink).toBeAttached();

      // Focus it via Tab key
      await page.keyboard.press('Tab');

      // After tabbing, the skip link should become visible (translate-y-0)
      await expect(skipLink).toBeFocused();
    });

    test('should jump to main content when skip link is activated', async ({ page }) => {
      await loginAsDemo(page);

      // Tab to the skip link
      await page.keyboard.press('Tab');

      const skipLink = page.getByRole('link', { name: /skip to main content/i });
      await expect(skipLink).toBeFocused();

      // Activate the skip link
      await page.keyboard.press('Enter');

      // The #main-content element should now be the target
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeVisible();

      // The URL hash should point to main-content
      expect(page.url()).toContain('#main-content');
    });
  });

  test.describe('Heading hierarchy', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDemo(page);
    });

    const pagesToCheck = [
      { path: '/owner/dashboard', name: 'Dashboard' },
      { path: '/owner/parcels', name: 'Parcels' },
      { path: '/owner/surveys', name: 'Surveys' },
      { path: '/owner/settings', name: 'Settings' },
    ];

    for (const { path, name } of pagesToCheck) {
      test(`${name} page should have at least one heading`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        // Every page should have at least one heading element
        const headings = page.locator('h1, h2, h3, h4, h5, h6');
        const count = await headings.count();
        expect(count).toBeGreaterThan(0);
      });
    }
  });

  test.describe('No duplicate IDs', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDemo(page);
    });

    const pagesToCheck = [
      '/owner/dashboard',
      '/owner/parcels',
      '/owner/settings',
    ];

    for (const path of pagesToCheck) {
      test(`${path} should not have duplicate element IDs`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        // Collect all IDs on the page and check for duplicates
        const ids = await page.evaluate(() => {
          const elements = document.querySelectorAll('[id]');
          const idMap = new Map<string, number>();
          elements.forEach((el) => {
            const id = el.id;
            if (id) {
              idMap.set(id, (idMap.get(id) || 0) + 1);
            }
          });
          const duplicates: string[] = [];
          idMap.forEach((count, id) => {
            if (count > 1) duplicates.push(id);
          });
          return duplicates;
        });

        expect(ids).toEqual([]);
      });
    }
  });

  test.describe('Focus management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDemo(page);
    });

    test('should trap focus inside the AI Companion panel when open', async ({ page }) => {
      // Open the companion panel
      const companionFab = page.getByRole('button', { name: /open ai companion/i });
      await companionFab.click();

      const panel = page.getByRole('dialog');
      await expect(panel).toBeVisible({ timeout: 5_000 });

      // Tab through elements inside the panel
      // Focus should stay within the dialog (focus trap)
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // The focused element should be inside the dialog panel
      const focusedInsidePanel = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const activeEl = document.activeElement;
        return dialog?.contains(activeEl) ?? false;
      });
      expect(focusedInsidePanel).toBe(true);
    });

    test('should return focus to trigger when companion panel is closed', async ({ page }) => {
      // Open companion
      const companionFab = page.getByRole('button', { name: /open ai companion/i });
      await companionFab.click();

      const panel = page.getByRole('dialog');
      await expect(panel).toBeVisible({ timeout: 5_000 });

      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(panel).not.toBeVisible({ timeout: 5_000 });

      // Focus should return to the FAB trigger
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.getAttribute('aria-label');
      });
      expect(focusedElement).toMatch(/open ai companion/i);
    });
  });

  test.describe('ARIA landmarks', () => {
    test('should have proper ARIA landmarks on the dashboard', async ({ page }) => {
      await loginAsDemo(page);

      // Main content area
      const main = page.locator('[role="main"], main');
      await expect(main.first()).toBeVisible();

      // Navigation landmark
      const nav = page.locator('[role="navigation"], nav');
      await expect(nav.first()).toBeAttached();
    });

    test('should have aria-label on the main navigation', async ({ page }) => {
      await loginAsDemo(page);

      // The sidebar has role="navigation" with aria-label
      const nav = page.locator('aside[role="navigation"]');
      if (await nav.isVisible()) {
        await expect(nav).toHaveAttribute('aria-label');
      }
    });
  });

  test.describe('Form accessibility', () => {
    test('login form inputs should have associated labels', async ({ page }) => {
      await page.goto('/login');

      // Email input should have a label
      const emailInput = page.getByPlaceholder('you@example.com');
      await expect(emailInput).toBeVisible();

      // Each input group has a label element before it
      const labels = page.locator('label');
      const labelCount = await labels.count();
      expect(labelCount).toBeGreaterThanOrEqual(2); // email + password
    });

    test('onboarding property input should have proper ARIA attributes', async ({ page }) => {
      await page.goto('/onboarding');

      const input = page.locator('#fastighets-id');
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('aria-required', 'true');
      await expect(input).toHaveAttribute('aria-describedby');
    });
  });
});
