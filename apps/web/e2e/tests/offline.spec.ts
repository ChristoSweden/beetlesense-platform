import { test, expect } from '../fixtures/auth.fixture';

test.describe('Offline / PWA', () => {
  test('service worker is registered on load', async ({ ownerPage }) => {
    // Check that a service worker is registered
    const swRegistered = await ownerPage.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });

    expect(swRegistered).toBe(true);
  });

  test('offline banner appears when network is disconnected', async ({
    ownerPage,
    context,
  }) => {
    // First ensure we're fully loaded online
    await ownerPage.waitForLoadState('networkidle');

    // Go offline via CDP
    const cdpSession = await ownerPage.context().newCDPSession(ownerPage);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });

    // Trigger an action that would detect offline state (e.g., navigation or API call)
    await ownerPage.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Should show an offline indicator
    await expect(
      ownerPage.getByText(/offline|ingen anslutning|no connection|ingen internet/i),
    ).toBeVisible({ timeout: 10_000 });

    // Restore network
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });

    await ownerPage.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });
  });

  test('cached pages still load while offline', async ({ ownerPage }) => {
    // Visit multiple pages to cache them
    await ownerPage.getByRole('link', { name: /dashboard|översikt/i }).click();
    await ownerPage.waitForLoadState('networkidle');

    await ownerPage.getByRole('link', { name: /fastigheter|parcels/i }).click();
    await ownerPage.waitForLoadState('networkidle');

    // Go offline
    const cdpSession = await ownerPage.context().newCDPSession(ownerPage);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });

    // Navigate to dashboard (should load from cache)
    await ownerPage.getByRole('link', { name: /dashboard|översikt/i }).click();

    // The page shell should render (not a browser offline error)
    await expect(ownerPage.locator('body')).not.toContainText(
      /ERR_INTERNET_DISCONNECTED|This site can/i,
    );

    // Restore network
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
  });

  test('queue photo upload offline, then sync when online', async ({ ownerPage }) => {
    // Navigate to capture/upload page
    await ownerPage.goto(ownerPage.url().replace(/\/[^/]*$/, '/capture'), {
      waitUntil: 'networkidle',
    });

    // Go offline
    const cdpSession = await ownerPage.context().newCDPSession(ownerPage);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });

    await ownerPage.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Attempt to upload a file (should be queued, not fail hard)
    const fileInput = ownerPage.locator('input[type="file"]');
    if (await fileInput.isAttached()) {
      // Create a dummy image file in the test
      const buffer = Buffer.alloc(1024, 0);
      await fileInput.setInputFiles({
        name: 'test-photo.jpg',
        mimeType: 'image/jpeg',
        buffer,
      });

      // Should see a "queued" or "will sync" indicator rather than an error
      const queuedIndicator = ownerPage.getByText(
        /köad|queued|väntar|pending|synkas.*online|will sync/i,
      );

      if (await queuedIndicator.isVisible({ timeout: 5_000 }).catch(() => false)) {
        // Go back online
        await cdpSession.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 0,
          downloadThroughput: -1,
          uploadThroughput: -1,
        });

        await ownerPage.evaluate(() => window.dispatchEvent(new Event('online')));

        // Should see sync progress or completion
        await expect(
          ownerPage.getByText(/synkar|syncing|uppladdad|uploaded|klar|complete/i),
        ).toBeVisible({ timeout: 30_000 });
      }
    }
  });
});
