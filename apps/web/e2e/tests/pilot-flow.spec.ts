import { test, expect } from '../fixtures/auth.fixture';

test.describe('Drone pilot flows', () => {
  test('login shows application form for new pilot or dashboard for approved', async ({
    pilotPage,
  }) => {
    await pilotPage.waitForURL(/\/pilot/, { timeout: 15_000 });

    // New pilot sees application form, approved pilot sees dashboard
    const applicationForm = pilotPage.getByText(
      /ansökan|application|bli pilot|become a pilot/i,
    );
    const dashboard = pilotPage.getByText(
      /dashboard|översikt|uppdrag|missions|aktiva jobb|active jobs/i,
    );

    // One of these should be visible
    const formVisible = await applicationForm.isVisible({ timeout: 5_000 }).catch(() => false);
    const dashVisible = await dashboard.isVisible({ timeout: 5_000 }).catch(() => false);

    expect(formVisible || dashVisible).toBe(true);
  });

  test('browse job board and filter by distance', async ({ pilotPage }) => {
    // Navigate to job board
    await pilotPage.getByRole('link', { name: /uppdrag|jobs|jobb/i }).click();
    await pilotPage.waitForURL(/\/pilot\/jobs|\/pilot\/job-board/, { timeout: 10_000 });

    // Should see job listing or empty state
    await expect(
      pilotPage.getByText(/tillgängliga uppdrag|available jobs|inga uppdrag|no jobs/i),
    ).toBeVisible({ timeout: 10_000 });

    // Filter by distance — look for a distance filter control
    const distanceFilter = pilotPage.getByLabel(/avstånd|distance|radie|radius/i);
    if (await distanceFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await distanceFilter.selectOption({ index: 1 }); // Select second option (e.g., 50km)

      // Wait for filtered results to load
      await pilotPage.waitForTimeout(1_000);
    }
  });

  test('accept a job and see checklist', async ({ pilotPage }) => {
    await pilotPage.getByRole('link', { name: /uppdrag|jobs|jobb/i }).click();
    await pilotPage.waitForURL(/\/pilot\/jobs|\/pilot\/job-board/, { timeout: 10_000 });

    // Click on the first available job
    const firstJob = pilotPage
      .locator('[data-testid="job-card"], a[href*="/pilot/jobs/"]')
      .first();

    if (await firstJob.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstJob.click();

      // Wait for job detail page
      await pilotPage.waitForURL(/\/pilot\/jobs\//, { timeout: 10_000 });

      // Click accept button
      const acceptButton = pilotPage.getByRole('button', {
        name: /acceptera|accept|ta uppdraget|take job/i,
      });

      if (await acceptButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await acceptButton.click();

        // Should see pre-flight checklist
        await expect(
          pilotPage.getByText(/checklista|checklist|förberedelser|preparation/i),
        ).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test('upload data flow', async ({ pilotPage }) => {
    // Navigate to an active job or upload page
    await pilotPage.getByRole('link', { name: /uppladdning|upload|data/i }).click();

    // Should see upload interface
    await expect(
      pilotPage.getByText(
        /ladda upp|upload|dra och släpp|drag and drop|välj filer|select files/i,
      ),
    ).toBeVisible({ timeout: 10_000 });

    // Verify file input exists
    const fileInput = pilotPage.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });
});
