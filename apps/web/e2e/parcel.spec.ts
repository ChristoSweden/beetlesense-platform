import { test, expect } from './fixtures/test-user';
import { loginAsDemo } from './fixtures/test-user';

test.describe('Parcel management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test.describe('Parcel list', () => {
    test('should display the parcels page with a list of parcels', async ({ page }) => {
      await page.goto('/owner/parcels');
      await page.waitForLoadState('networkidle');

      // Page heading
      await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/parcels/i).first())).toBeVisible({
        timeout: 10_000,
      });

      // In demo mode, DEMO_PARCELS are loaded; first parcel is "Norra Skogen"
      await expect(page.getByText('Norra Skogen')).toBeVisible({ timeout: 10_000 });
    });

    test('should display parcel status badges', async ({ page }) => {
      await page.goto('/owner/parcels');
      await page.waitForLoadState('networkidle');

      // Status badges should render (e.g., "At Risk", "Healthy")
      await expect(
        page.getByText(/healthy|at risk|infested|unknown/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    test('should display parcel area information', async ({ page }) => {
      await page.goto('/owner/parcels');
      await page.waitForLoadState('networkidle');

      // Area values like "42.5 ha" or "18.3 ha" from demo data
      await expect(page.getByText(/ha\b/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('should display municipality information', async ({ page }) => {
      await page.goto('/owner/parcels');
      await page.waitForLoadState('networkidle');

      // Municipality names from demo data
      await expect(
        page.getByText(/Värnamo|Gislaved/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    test('should have a search input for filtering parcels', async ({ page }) => {
      await page.goto('/owner/parcels');
      await page.waitForLoadState('networkidle');

      const searchInput = page.getByRole('textbox').or(page.getByPlaceholder(/search/i));
      await expect(searchInput.first()).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Parcel detail', () => {
    test('should navigate to parcel detail when clicking a parcel', async ({ page }) => {
      await page.goto('/owner/parcels');
      await page.waitForLoadState('networkidle');

      // Click on the first parcel in the list
      const parcelLink = page.getByText('Norra Skogen');
      await expect(parcelLink).toBeVisible({ timeout: 10_000 });
      await parcelLink.click();

      // Should navigate to the parcel detail page
      await expect(page).toHaveURL(/\/owner\/parcels\//, { timeout: 10_000 });
    });

    test('should display parcel detail information', async ({ page }) => {
      // Navigate directly to a demo parcel
      await page.goto('/owner/parcels/p1');
      await page.waitForLoadState('networkidle');

      // Should show the parcel name
      await expect(page.getByText('Norra Skogen')).toBeVisible({ timeout: 10_000 });
    });

    test('should display species composition data', async ({ page }) => {
      await page.goto('/owner/parcels/p1');
      await page.waitForLoadState('networkidle');

      // Species from demo data: Spruce, Pine, Birch
      await expect(
        page.getByText(/spruce|pine|birch/i).first()
      ).toBeVisible({ timeout: 15_000 });
    });

    test('should have a map component on the parcel detail page', async ({ page }) => {
      await page.goto('/owner/parcels/p1');
      await page.waitForLoadState('networkidle');

      // Map container (MapLibre GL canvas or container)
      const mapElement = page.locator('[class*="maplibregl"], canvas, [class*="map"]');
      await expect(mapElement.first()).toBeVisible({ timeout: 15_000 });
    });
  });
});
