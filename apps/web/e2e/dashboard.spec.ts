import { test, expect } from './fixtures/test-user';
import { loginAsDemo } from './fixtures/test-user';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('should render the dashboard page', async ({ page }) => {
    await expect(page).toHaveURL(/\/owner\/dashboard/);
    // Dashboard title should be visible in the sidebar panel
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });
  });

  test('should display stat cards with demo data', async ({ page }) => {
    // Wait for stats to load (demo data loads synchronously)
    await page.waitForSelector('[class*="StatCard"], [class*="stat"], .grid', {
      timeout: 10_000,
    });

    // The dashboard shows stat cards: Total Parcels, Active Surveys, Recent Alerts, AI Sessions
    // These render as numeric values in the stat grid
    const statValues = page.locator('.font-mono.text-2xl, .text-2xl.font-semibold');
    await expect(statValues.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should display the Forest Health Score widget', async ({ page }) => {
    // The Forest Health Score is a prominent widget on the dashboard
    await expect(
      page.getByText(/forest health|health score/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should display the Weather widget', async ({ page }) => {
    // WeatherWidget is rendered with parcelId="p1"
    await expect(
      page.getByText(/weather|temperature|forecast|wind/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('should display quick action links', async ({ page }) => {
    // Quick actions section
    await expect(page.getByText(/quick actions/i)).toBeVisible({ timeout: 10_000 });

    // Individual quick action items
    await expect(page.getByRole('link', { name: /survey/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /capture|photo/i }).first()).toBeVisible();
  });

  test('should display recent activity feed', async ({ page }) => {
    await expect(
      page.getByText(/recent activity/i)
    ).toBeVisible({ timeout: 10_000 });

    // In demo mode, hardcoded activity items are shown
    await expect(
      page.getByText(/bark beetle|survey completed|alert/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should have an AI companion toggle button', async ({ page }) => {
    // The companion FAB (Floating Action Button) should be visible
    const companionFab = page.getByRole('button', { name: /open ai companion/i });
    await expect(companionFab).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to surveys from quick actions', async ({ page }) => {
    const surveyLink = page.getByRole('link', { name: /survey/i }).first();
    await expect(surveyLink).toBeVisible({ timeout: 10_000 });
    await surveyLink.click();
    await expect(page).toHaveURL(/\/owner\/surveys/);
  });

  test('should navigate to capture from quick actions', async ({ page }) => {
    const captureLink = page.getByRole('link', { name: /capture|photo/i }).first();
    await expect(captureLink).toBeVisible({ timeout: 10_000 });
    await captureLink.click();
    await expect(page).toHaveURL(/\/owner\/capture/);
  });

  test('should render the map area', async ({ page }) => {
    // The BaseMap component creates a canvas element via MapLibre GL
    // or at minimum a container div
    const mapContainer = page.locator('[class*="maplibregl"], canvas, [data-tour="map"]');
    await expect(mapContainer.first()).toBeVisible({ timeout: 15_000 });
  });
});
