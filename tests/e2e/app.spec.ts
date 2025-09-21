import { test, expect } from '@playwright/test';

test.describe('LinguaFlip Application', () => {
  test('should load the homepage successfully', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Check if the page loaded successfully
    await expect(page).toHaveTitle(/LinguaFlip/);

    // Check for main elements on the homepage
    await expect(page.locator('h1').first()).toBeVisible();

    // Check if the main navigation is present (optional - some pages might not have nav)
    const navElement = page.locator('nav, [role="navigation"], .navigation, .nav');
    if (await navElement.count() > 0) {
      await expect(navElement.first()).toBeVisible();
    }

    // Verify the page is interactive by checking for buttons or links
    const interactiveElements = page.locator('button, a');
    await expect(interactiveElements.first()).toBeVisible();
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Check for essential meta tags
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);

    // Check for charset
    const charset = page.locator('meta[charset]');
    await expect(charset).toHaveAttribute('charset', /utf-8/i);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Check that content is still accessible on mobile
    await expect(page.locator('main')).toBeVisible();

    // Verify that the layout adapts to mobile
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should load without accessibility violations', async ({ page }) => {
    await page.goto('/');

    // Basic accessibility check - ensure images have alt text
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      // Allow empty alt text for decorative images, but ensure alt attribute exists
      await expect(img).toHaveAttribute('alt');
    }
  });
});