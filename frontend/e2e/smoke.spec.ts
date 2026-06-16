import { test, expect } from '@playwright/test';

test('app loads and shows toolbar', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('button[title="Select (V)"]')).toBeVisible();
});

test('navigation controls are visible and functional', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('zoom-display')).toBeVisible();
  await page.locator('button[title="Zoom In"]').click();
  await expect(page.getByTestId('zoom-display')).toHaveText('120%');
});
