import { test, expect } from '@playwright/test';

test('visual regression - empty state', async ({ page }) => {
  await page.goto('/');
  // Wait for React to render
  await expect(page.locator('button[title="Select (V)"]')).toBeVisible();
  await expect(page).toHaveScreenshot('empty-state.png', {
      mask: [page.locator('.animate-pulse')] // Mask pulsing icons to avoid flakiness
  });
});
