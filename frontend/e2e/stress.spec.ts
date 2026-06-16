import { test, expect } from '@playwright/test';

test('stress test - rapid navigation and tool switching', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('button[title="Select (V)"]')).toBeVisible();

  // Rapid tool switching
  const tools = ['Pan (H)', 'Add Component (A)', 'Calibrate Scale (C)', 'Select (V)'];
  for (let i = 0; i < 3; i++) {
    for (const tool of tools) {
      await page.locator(`button[title="${tool}"]`).click();
      await page.waitForTimeout(100);
    }
  }

  // Rapid zoom
  for (let i = 0; i < 5; i++) {
    await page.locator('button[title="Zoom In"]').click();
  }
  await expect(page.getByTestId('zoom-display')).not.toHaveText('100%');

  // Command palette stress
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  const searchInput = page.locator('input[placeholder*="Search"]');
  await expect(searchInput).toBeVisible();
  await searchInput.type('Top');
  await page.keyboard.press('Enter');

  // Verify view mode updated in status bar
  await expect(page.locator('text=View:top')).toBeVisible();
});

test('visual regression - status bar and layout', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('button[title="Select (V)"]')).toBeVisible();
  // Ensure status bar is rendered
  await expect(page.locator('text=Tool:select')).toBeVisible();

  await expect(page).toHaveScreenshot('full-layout.png', {
      mask: [page.locator('.animate-pulse'), page.locator('[data-testid="zoom-display"]')]
  });
});
