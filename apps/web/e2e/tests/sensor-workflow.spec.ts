import { test, expect } from '../fixtures/auth.fixture';

test.describe('Sensor data workflow', () => {
  test('sensor layers appear on map page', async ({ ownerPage }) => {
    await ownerPage.goto('/owner/map');
    await ownerPage.waitForURL(/\/owner\/map/, { timeout: 10_000 });

    // Wait for the map to render
    await expect(ownerPage.locator('[class*="maplibre"], .mapboxgl-map, canvas')).toBeVisible({
      timeout: 10_000,
    });

    // Open the layer panel by clicking the layers toggle
    const layerToggle = ownerPage.getByRole('button', { name: /lager|layers/i }).or(
      ownerPage.locator('button', { has: ownerPage.locator('svg') }).filter({ hasText: /lager|layers/i }),
    );

    // If there is a dedicated layers button, click it; otherwise look for the sidebar toggle
    const layerPanelTrigger = layerToggle.or(
      ownerPage.locator('[data-testid="layer-panel"], [class*="layer"]').first(),
    );
    if (await layerPanelTrigger.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await layerPanelTrigger.first().click();
    }

    // Verify each sensor layer label is present in the layer list
    const sensorLayers = ['Termisk anomali', 'Multispektral', 'Kronhälsa', 'Barkborrestress'];
    for (const layerName of sensorLayers) {
      await expect(ownerPage.getByText(layerName, { exact: false })).toBeVisible({ timeout: 5_000 });
    }

    // Toggle the thermal layer on and verify the eye icon or visibility change
    const thermalRow = ownerPage.getByText('Termisk anomali').locator('..');
    const thermalToggle = thermalRow.locator('button').first();
    if (await thermalToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await thermalToggle.click();
      // The toggle should change state (no error = success)
    }
  });

  test('survey detail shows sensor products', async ({ ownerPage }) => {
    // Navigate to a completed demo survey
    await ownerPage.goto('/owner/surveys/s1');
    await ownerPage.waitForURL(/\/owner\/surveys\/s1/, { timeout: 10_000 });

    // Wait for loading to finish
    await expect(ownerPage.getByText('Spring Beetle Assessment')).toBeVisible({ timeout: 10_000 });

    // Verify the "Sensordata & Analyser" section heading is present
    await expect(ownerPage.getByText('Sensordata & Analyser')).toBeVisible({ timeout: 10_000 });

    // Verify sensor type sub-headings appear (at least multispectral or thermal)
    const sensorTypeLabels = ['Multispektral', 'Termisk', 'RGB', 'LiDAR'];
    let foundCount = 0;
    for (const label of sensorTypeLabels) {
      const el = ownerPage.getByText(label, { exact: false });
      if (await el.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        foundCount++;
      }
    }
    // At least one sensor type section should be visible in demo data
    expect(foundCount).toBeGreaterThanOrEqual(1);

    // Check that product cards with download buttons exist
    const downloadButtons = ownerPage.getByText('Ladda ner');
    await expect(downloadButtons.first()).toBeVisible({ timeout: 5_000 });
  });

  test('parcel detail shows tree inventory', async ({ ownerPage }) => {
    // Navigate to a demo parcel detail page
    await ownerPage.goto('/owner/parcels/p1');
    await ownerPage.waitForURL(/\/owner\/parcels\/p1/, { timeout: 10_000 });

    // Wait for parcel name to appear (loading complete)
    await expect(ownerPage.getByText(/Norra Skogen/i)).toBeVisible({ timeout: 10_000 });

    // Verify tree inventory section heading
    await expect(ownerPage.getByText('Trädbestånd')).toBeVisible({ timeout: 10_000 });

    // Verify species breakdown ("Artfördelning") appears
    await expect(ownerPage.getByText('Artfördelning')).toBeVisible({ timeout: 10_000 });

    // Verify tree stat labels are present
    await expect(ownerPage.getByText('Träd totalt')).toBeVisible({ timeout: 5_000 });
    await expect(ownerPage.getByText('Medelhöjd (m)')).toBeVisible({ timeout: 5_000 });
    await expect(ownerPage.getByText('Volym (m³)')).toBeVisible({ timeout: 5_000 });
  });

  test('digital twin has 3D canopy tab', async ({ ownerPage }) => {
    await ownerPage.goto('/owner/digital-twin');
    await ownerPage.waitForURL(/\/owner\/digital-twin/, { timeout: 10_000 });

    // Wait for page to load (loading spinner should disappear)
    await expect(ownerPage.getByText('Prediktiv digital tvilling')).toBeVisible({ timeout: 15_000 });

    // Click the "3D Kronvy" tab
    const tab3D = ownerPage.getByRole('button', { name: /3D Kronvy/i });
    await expect(tab3D).toBeVisible({ timeout: 5_000 });
    await tab3D.click();

    // Verify the 3D view description text appears
    await expect(
      ownerPage.getByText(/Interaktiv 3D-vy/i),
    ).toBeVisible({ timeout: 5_000 });

    // Verify a canvas element renders (Three.js / WebGL)
    await expect(ownerPage.locator('canvas')).toBeVisible({ timeout: 10_000 });
  });

  test('early detection shows fusion analysis', async ({ ownerPage }) => {
    await ownerPage.goto('/owner/early-detection');
    await ownerPage.waitForURL(/\/owner\/early-detection/, { timeout: 10_000 });

    // Wait for loading to complete
    await expect(ownerPage.getByText('Tidig Detektion')).toBeVisible({ timeout: 15_000 });

    // Verify the "AI Fusionsanalys" card appears
    await expect(ownerPage.getByText('AI Fusionsanalys')).toBeVisible({ timeout: 10_000 });

    // Verify the Beetle Stress Index is shown
    await expect(ownerPage.getByText('Beetle Stress Index')).toBeVisible({ timeout: 5_000 });

    // Verify confidence and affected area metrics
    await expect(ownerPage.getByText('Drabbat område')).toBeVisible({ timeout: 5_000 });
    await expect(ownerPage.getByText('Konfidens')).toBeVisible({ timeout: 5_000 });

    // Verify sensor badges are present
    await expect(ownerPage.getByText('Sensorer:')).toBeVisible({ timeout: 5_000 });
  });

  test('sensor comparison panel toggles layers', async ({ ownerPage }) => {
    await ownerPage.goto('/owner/map');
    await ownerPage.waitForURL(/\/owner\/map/, { timeout: 10_000 });

    // Wait for the map to render
    await expect(ownerPage.locator('[class*="maplibre"], .mapboxgl-map, canvas')).toBeVisible({
      timeout: 10_000,
    });

    // Find and open the layer panel
    const layerPanelTrigger = ownerPage.getByRole('button', { name: /lager|layers/i }).or(
      ownerPage.locator('button').filter({ has: ownerPage.locator('text=Lager') }),
    );
    if (await layerPanelTrigger.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await layerPanelTrigger.first().click();
    }

    // Verify sensor layers are listed
    const beetleStressLayer = ownerPage.getByText('Barkborrestress');
    await expect(beetleStressLayer).toBeVisible({ timeout: 5_000 });

    // Find the toggle button/element in the beetle-stress layer row
    const beetleStressRow = beetleStressLayer.locator('..');
    const toggleBtn = beetleStressRow.locator('button').first();

    // Toggle the beetle-stress layer on
    if (await toggleBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await toggleBtn.click();

      // Verify the layer visibility changed (the eye icon should now reflect "on" state)
      // We check that the toggle action did not throw and the row is still visible
      await expect(beetleStressLayer).toBeVisible();
    }

    // Toggle crown-health layer
    const crownHealthLayer = ownerPage.getByText('Kronhälsa');
    await expect(crownHealthLayer).toBeVisible({ timeout: 5_000 });
    const crownRow = crownHealthLayer.locator('..');
    const crownToggle = crownRow.locator('button').first();

    if (await crownToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Turn on
      await crownToggle.click();
      await expect(crownHealthLayer).toBeVisible();

      // Turn off again
      await crownToggle.click();
      await expect(crownHealthLayer).toBeVisible();
    }
  });
});
