import { test, expect } from './fixtures/test-user';
import { loginAsDemo } from './fixtures/test-user';

test.describe('AI Companion', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('should show the companion FAB button on the dashboard', async ({ page }) => {
    const companionFab = page.getByRole('button', { name: /open ai companion/i });
    await expect(companionFab).toBeVisible({ timeout: 10_000 });
  });

  test('should open the companion panel when clicking the FAB', async ({ page }) => {
    // Click the companion FAB
    const companionFab = page.getByRole('button', { name: /open ai companion/i });
    await companionFab.click();

    // Panel should appear as a dialog
    const panel = page.getByRole('dialog', { name: /ai.*companion|forest expert/i });
    await expect(panel).toBeVisible({ timeout: 5_000 });

    // Panel header should show title
    await expect(page.getByText('Forest Expert AI')).toBeVisible();
  });

  test('should display suggested prompts when no messages exist', async ({ page }) => {
    const companionFab = page.getByRole('button', { name: /open ai companion/i });
    await companionFab.click();

    // Suggested prompts should be visible
    await expect(page.getByText('What are signs of bark beetle?')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Explain my NDVI results')).toBeVisible();
    await expect(page.getByText('Swedish forestry rules')).toBeVisible();
  });

  test('should fill input when clicking a suggested prompt', async ({ page }) => {
    const companionFab = page.getByRole('button', { name: /open ai companion/i });
    await companionFab.click();

    // Click a suggested prompt
    await page.getByText('What are signs of bark beetle?').click();

    // Input should be filled
    const input = page.locator('#companion-input');
    await expect(input).toHaveValue('What are signs of bark beetle?');
  });

  test('should have a text input and send button', async ({ page }) => {
    const companionFab = page.getByRole('button', { name: /open ai companion/i });
    await companionFab.click();

    // Text input
    const input = page.locator('#companion-input');
    await expect(input).toBeVisible({ timeout: 5_000 });

    // Send button
    const sendButton = page.getByRole('button', { name: /send message/i });
    await expect(sendButton).toBeVisible();
  });

  test('should allow typing a message in the input', async ({ page }) => {
    const companionFab = page.getByRole('button', { name: /open ai companion/i });
    await companionFab.click();

    const input = page.locator('#companion-input');
    await input.fill('How do I detect bark beetle infestations?');
    await expect(input).toHaveValue('How do I detect bark beetle infestations?');
  });

  test('should send a message and show it in the chat log', async ({ page }) => {
    const companionFab = page.getByRole('button', { name: /open ai companion/i });
    await companionFab.click();

    // Type and send a message
    const input = page.locator('#companion-input');
    await input.fill('What is bark beetle?');

    const sendButton = page.getByRole('button', { name: /send message/i });
    await sendButton.click();

    // The user message should appear in the chat log
    const chatLog = page.getByRole('log');
    await expect(chatLog.getByText('What is bark beetle?')).toBeVisible({ timeout: 10_000 });

    // Wait briefly for any response (demo or streaming) to appear
    // The response may be a demo fallback or actual AI response
    await page.waitForTimeout(3_000);

    // There should be at least one message visible (the user's message)
    const messages = chatLog.locator('[class*="ChatMessage"], [class*="message"], [class*="chat"]');
    const messageCount = await messages.count();
    expect(messageCount).toBeGreaterThanOrEqual(1);
  });

  test('should close the companion panel', async ({ page }) => {
    const companionFab = page.getByRole('button', { name: /open ai companion/i });
    await companionFab.click();

    // Panel should be open
    const panel = page.getByRole('dialog', { name: /ai.*companion|forest expert/i });
    await expect(panel).toBeVisible({ timeout: 5_000 });

    // Click the close button
    const closeButton = page.getByRole('button', { name: /close ai companion/i });
    await closeButton.click();

    // Panel should be hidden
    await expect(panel).not.toBeVisible({ timeout: 5_000 });

    // FAB should reappear
    await expect(
      page.getByRole('button', { name: /open ai companion/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test('should close panel with Escape key', async ({ page }) => {
    const companionFab = page.getByRole('button', { name: /open ai companion/i });
    await companionFab.click();

    const panel = page.getByRole('dialog', { name: /ai.*companion|forest expert/i });
    await expect(panel).toBeVisible({ timeout: 5_000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Panel should close
    await expect(panel).not.toBeVisible({ timeout: 5_000 });
  });

  test('should have proper ARIA attributes on the panel', async ({ page }) => {
    const companionFab = page.getByRole('button', { name: /open ai companion/i });
    await companionFab.click();

    const panel = page.getByRole('dialog');
    await expect(panel).toHaveAttribute('aria-modal', 'true');
    await expect(panel).toHaveAttribute('aria-label');
  });
});
