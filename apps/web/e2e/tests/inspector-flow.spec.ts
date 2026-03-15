import { test, expect } from '../fixtures/auth.fixture';

test.describe('Inspector flows', () => {
  test('inspector registration and immediate activation', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/signup`);

    // Fill signup form
    await page.getByLabel(/e-post|email/i).fill('new-inspector@example.test');
    await page.getByLabel(/namn|name/i).fill('Ny Inspektör');

    // Select inspector role
    await page.getByRole('radio', { name: /inspektör|inspector|värderare|valuator/i }).check();

    // Submit
    await page.getByRole('button', { name: /skapa konto|sign up|create account/i }).click();

    // Inspector accounts should be immediately active (no approval step)
    await expect(
      page.getByText(/konto skapat|account created|kontrollera din e-post|check your email/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('view client list', async ({ inspectorPage }) => {
    await inspectorPage.waitForURL(/\/inspector/, { timeout: 15_000 });

    // Navigate to clients
    await inspectorPage.getByRole('link', { name: /klienter|clients|kunder|customers/i }).click();

    // Should see client list or empty state
    await expect(
      inspectorPage.getByText(/dina klienter|your clients|inga klienter|no clients/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('create valuation report: select client and parcel', async ({ inspectorPage }) => {
    await inspectorPage.waitForURL(/\/inspector/, { timeout: 15_000 });

    // Navigate to reports
    await inspectorPage
      .getByRole('link', { name: /rapporter|reports|värderingar|valuations/i })
      .click();

    // Click create new report
    await inspectorPage
      .getByRole('button', {
        name: /ny rapport|new report|ny värdering|new valuation|skapa|create/i,
      })
      .click();

    // Should see report builder form
    await expect(
      inspectorPage.getByText(/skapa rapport|create report|värderingsrapport|valuation report/i),
    ).toBeVisible({ timeout: 10_000 });

    // Select client dropdown (if clients exist)
    const clientSelect = inspectorPage.getByLabel(/klient|client|kund|customer/i);
    if (await clientSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await clientSelect.selectOption({ index: 1 });
    }

    // Select parcel dropdown (if parcels exist)
    const parcelSelect = inspectorPage.getByLabel(/fastighet|parcel|skifte/i);
    if (await parcelSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await parcelSelect.selectOption({ index: 1 });
    }
  });

  test('share report with client', async ({ inspectorPage }) => {
    await inspectorPage.waitForURL(/\/inspector/, { timeout: 15_000 });

    // Navigate to reports
    await inspectorPage
      .getByRole('link', { name: /rapporter|reports|värderingar|valuations/i })
      .click();

    // Click on the first report
    const firstReport = inspectorPage
      .locator('[data-testid="report-card"], a[href*="/reports/"]')
      .first();

    if (await firstReport.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstReport.click();

      // Click share button
      const shareButton = inspectorPage.getByRole('button', {
        name: /dela|share|skicka till klient|send to client/i,
      });

      if (await shareButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await shareButton.click();

        // Should see sharing modal/confirmation
        await expect(
          inspectorPage.getByText(
            /delad|shared|skickad|sent|dela rapport|share report/i,
          ),
        ).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});
