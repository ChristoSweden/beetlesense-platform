import { test, expect } from '../fixtures/auth.fixture';

test.describe('Forest owner flows', () => {
  test('dashboard shows map on login', async ({ ownerPage }) => {
    // After fixture authenticates, we should be on the dashboard
    await ownerPage.waitForURL(/\/owner\/dashboard|\/dashboard/, { timeout: 15_000 });

    // Dashboard should contain a map component
    await expect(ownerPage.locator('[class*="maplibre"], .mapboxgl-map, canvas')).toBeVisible({
      timeout: 10_000,
    });

    // Should show a welcome or summary section
    await expect(
      ownerPage.getByText(/översikt|dashboard|välkommen|welcome/i),
    ).toBeVisible();
  });

  test('navigate to parcels and see parcel list', async ({ ownerPage }) => {
    // Click parcels in navigation
    await ownerPage.getByRole('link', { name: /fastigheter|parcels|skiften/i }).click();
    await ownerPage.waitForURL(/\/parcels/, { timeout: 10_000 });

    // Should see parcel list or empty state
    await expect(
      ownerPage.getByText(/dina fastigheter|your parcels|inga fastigheter|no parcels/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('create new survey: select modules and confirm', async ({ ownerPage }) => {
    // Navigate to surveys
    await ownerPage.getByRole('link', { name: /inventeringar|surveys/i }).click();
    await ownerPage.waitForURL(/\/surveys/, { timeout: 10_000 });

    // Click create new survey
    await ownerPage
      .getByRole('button', { name: /ny inventering|new survey|skapa|create/i })
      .click();

    // Survey wizard should open
    await expect(
      ownerPage.getByText(/välj moduler|select modules|inventering/i),
    ).toBeVisible({ timeout: 10_000 });

    // Select at least one module (e.g., bark beetle detection)
    const barkBeetleModule = ownerPage.getByText(/barkborre|bark beetle|granbarkborre/i);
    if (await barkBeetleModule.isVisible()) {
      await barkBeetleModule.click();
    }

    // Look for a confirm/next button
    const confirmButton = ownerPage.getByRole('button', {
      name: /bekräfta|confirm|nästa|next|skicka|submit/i,
    });
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // Should show confirmation or redirect to survey detail
    await expect(
      ownerPage.getByText(/inventering skapad|survey created|status|beställning/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('view survey detail with status tracker', async ({ ownerPage }) => {
    await ownerPage.getByRole('link', { name: /inventeringar|surveys/i }).click();
    await ownerPage.waitForURL(/\/surveys/, { timeout: 10_000 });

    // Click on the first survey in the list (if any)
    const firstSurvey = ownerPage.locator('[data-testid="survey-card"], a[href*="/surveys/"]').first();
    if (await firstSurvey.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstSurvey.click();

      // Should see status tracker
      await expect(
        ownerPage.getByText(/status|framsteg|progress|steg|steps/i),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('open AI Companion and send a message', async ({ ownerPage }) => {
    // Open the companion panel
    const companionToggle = ownerPage.getByRole('button', {
      name: /ai.*(assistent|companion|hjälp)|fråga|ask/i,
    });
    await companionToggle.click();

    // Companion panel should be visible
    await expect(
      ownerPage.locator('[data-testid="companion-panel"], [class*="companion"]'),
    ).toBeVisible({ timeout: 5_000 });

    // Type a message
    const chatInput = ownerPage.getByPlaceholder(
      /ställ en fråga|ask a question|skriv|type/i,
    );
    await chatInput.fill('Hur identifierar jag granbarkborre?');
    await chatInput.press('Enter');

    // Should see a streaming response (wait for assistant message bubble)
    await expect(
      ownerPage.locator('[data-testid="assistant-message"], [class*="assistant"], [class*="bot"]'),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('navigate to reports page', async ({ ownerPage }) => {
    await ownerPage.getByRole('link', { name: /rapporter|reports/i }).click();
    await ownerPage.waitForURL(/\/reports/, { timeout: 10_000 });

    await expect(
      ownerPage.getByText(/rapporter|reports|inga rapporter|no reports/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});
