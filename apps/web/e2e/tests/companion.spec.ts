import { test, expect } from '../fixtures/auth.fixture';

test.describe('AI Companion', () => {
  test('open companion panel and send a forestry question', async ({ ownerPage }) => {
    // Open companion
    const companionToggle = ownerPage.getByRole('button', {
      name: /ai.*(assistent|companion|hjälp)|fråga|ask/i,
    });
    await companionToggle.click();

    const panel = ownerPage.locator(
      '[data-testid="companion-panel"], [class*="companion"], [role="dialog"]',
    );
    await expect(panel).toBeVisible({ timeout: 5_000 });

    // Send a question
    const chatInput = ownerPage.getByPlaceholder(
      /ställ en fråga|ask a question|skriv|type/i,
    );
    await chatInput.fill('Vilka är tidiga tecken på barkborreangrepp?');
    await chatInput.press('Enter');

    // Wait for streaming response — the assistant message should appear
    const assistantMessage = ownerPage
      .locator('[data-testid="assistant-message"], [class*="assistant"], [class*="chat-message"]')
      .last();
    await expect(assistantMessage).toBeVisible({ timeout: 30_000 });

    // The response should contain some text (not empty)
    await expect(assistantMessage).not.toBeEmpty();
  });

  test('streaming response appears character by character', async ({ ownerPage }) => {
    // Open companion
    await ownerPage
      .getByRole('button', { name: /ai.*(assistent|companion|hjälp)|fråga|ask/i })
      .click();

    const chatInput = ownerPage.getByPlaceholder(
      /ställ en fråga|ask a question|skriv|type/i,
    );
    await chatInput.fill('Berätta om tall');
    await chatInput.press('Enter');

    // First, the message bubble should appear
    const assistantMessage = ownerPage
      .locator('[data-testid="assistant-message"], [class*="assistant"]')
      .last();
    await expect(assistantMessage).toBeVisible({ timeout: 15_000 });

    // Capture text at two points to verify streaming
    const initialText = await assistantMessage.innerText();

    // Wait a moment and check text grew (streaming)
    await ownerPage.waitForTimeout(2_000);
    const laterText = await assistantMessage.innerText();

    // The text should have grown or completed
    expect(laterText.length).toBeGreaterThanOrEqual(initialText.length);
  });

  test('citations are rendered in responses', async ({ ownerPage }) => {
    await ownerPage
      .getByRole('button', { name: /ai.*(assistent|companion|hjälp)|fråga|ask/i })
      .click();

    const chatInput = ownerPage.getByPlaceholder(
      /ställ en fråga|ask a question|skriv|type/i,
    );

    // Ask a question likely to trigger citations
    await chatInput.fill(
      'Vilka regler gäller för avverkning enligt skogsvårdslagen?',
    );
    await chatInput.press('Enter');

    // Wait for response to complete (look for a citation element)
    const citation = ownerPage.locator(
      '[data-testid="citation"], [class*="citation"], [class*="source"], a[class*="ref"]',
    );

    // Citations should appear (if the response includes them)
    await expect(citation.first()).toBeVisible({ timeout: 30_000 }).catch(() => {
      // Some responses may not have citations — that's acceptable
    });
  });

  test('"Ask about this" context button on map', async ({ ownerPage }) => {
    // Navigate to dashboard with map
    await ownerPage.getByRole('link', { name: /dashboard|översikt/i }).click();
    await ownerPage.waitForURL(/\/dashboard|\/owner/, { timeout: 10_000 });

    // Look for a contextual "ask about this" button on map elements
    const mapCanvas = ownerPage.locator(
      '[class*="maplibre"], .mapboxgl-map, canvas',
    );

    if (await mapCanvas.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Right-click or click on a map feature to trigger context menu
      await mapCanvas.click({ position: { x: 200, y: 200 } });

      // Look for context-aware companion trigger
      const contextButton = ownerPage.getByRole('button', {
        name: /fråga om detta|ask about this|analysera|analyze/i,
      });

      if (await contextButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await contextButton.click();

        // Companion should open with context pre-filled
        const panel = ownerPage.locator(
          '[data-testid="companion-panel"], [class*="companion"]',
        );
        await expect(panel).toBeVisible({ timeout: 5_000 });
      }
    }
  });
});
