import { test, expect } from '@playwright/test';

test.describe('Face Recognition App Stability and UI Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('admin', JSON.stringify({
        username: 'Test Admin',
        email: 'admin@example.com',
        token: 'test-token',
      }));
    });

    // Mock the recognition API to avoid actual backend calls during UI tests
    await page.route('**/recognize', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ usn: 'Unknown', message: 'No face detected' }),
      });
    });
    
    // Mock students API
    await page.route('**/api/students**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pathname.endsWith('/attendance') ? [] : [
          { usn: '4SR21CS001', name: 'John Doe', course: 'CSE', enrolledAt: new Date().toISOString() }
        ]),
      });
    });

    // Mock attendance API
  });

  test('Frontpage camera starts without AbortError and Dashboard navigates', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('http://localhost:5173/');
    
    // Wait for the page to load and give camera initialization some time
    await page.waitForTimeout(2000);
    
    // Check for AbortError in console
    const hasAbortError = consoleErrors.some(err => err.includes('AbortError'));
    expect(hasAbortError).toBe(false);

    // Verify Dashboard button and navigation
    const dashboardBtn = page.locator('button:has-text("Dashboard")');
    await expect(dashboardBtn).toBeVisible();
    await dashboardBtn.click();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Dashboard charts render without dimension warnings', async ({ page }) => {
    const consoleWarnings = [];
    page.on('console', msg => {
      if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    });

    await page.goto('http://localhost:5173/dashboard');
    
    // Wait for Recharts to attempt rendering
    await page.waitForTimeout(2000);
    
    // Check for specific Recharts dimension warning
    const hasDimensionWarning = consoleWarnings.some(warn => 
      warn.includes('The width(-1) and height(-1) of chart should be greater than 0')
    );
    expect(hasDimensionWarning).toBe(false);
    
    // Verify distribution chart container exists
    await expect(page.locator('text=Distribution')).toBeVisible();
    await expect(page.locator('.recharts-responsive-container')).toBeVisible();
  });

  test('Add Student page initializes camera correctly', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('http://localhost:5173/Addstudent');
    await page.waitForTimeout(2000);

    const hasPlayError = consoleErrors.some(err => err.includes('Play error'));
    expect(hasPlayError).toBe(false);
    
    // Verify video element exists (even if hidden in some views)
    const video = page.locator('video');
    await expect(video).toBeAttached();
  });

  test('Enrolled page face update modal initializes camera', async ({ page }) => {
    await page.goto('http://localhost:5173/Enrolled');
    
    // Click on the student row action button (FaChevronRight)
    await page.locator('table tbody tr >> td:nth-child(6) >> button').first().click();
    
    // Verify modal is visible
    await expect(page.getByRole('button', { name: 'Update Face Recognition' })).toBeVisible();
    
    // Click Update Enrollment Image to trigger camera
    await page.getByRole('button', { name: 'Update Face Recognition' }).click();
    
    // Verify camera video element appears in modal
    const modalVideo = page.locator('.fixed video');
    await expect(modalVideo).toBeVisible();
    
    await page.waitForTimeout(1000);
  });

});
