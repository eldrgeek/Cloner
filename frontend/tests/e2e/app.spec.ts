import { test, expect } from '@playwright/test';

test.describe('Cloner App', () => {
  test('has title and basic content', async ({ page }) => {
    await page.goto('/');

    // Expect the page to have a title containing "Cloner"
    await expect(page).toHaveTitle(/Cloner/);

    // Check for basic React app elements
    await expect(page.locator('#root')).toBeVisible();
  });

  test('can navigate and interact with the app', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/app-loaded.png', fullPage: true });
  });
});

test.describe('API Integration', () => {
  test('can connect to backend API', async ({ page }) => {
    // Test API health check
    const response = await page.request.get('http://localhost:8000/api/health');
    expect(response.ok()).toBeTruthy();
    
    const healthData = await response.json();
    expect(healthData).toHaveProperty('status');
  });
});