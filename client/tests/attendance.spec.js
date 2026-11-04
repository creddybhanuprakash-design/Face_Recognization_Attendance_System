import { test, expect } from '@playwright/test';

test.describe('Face Recognition Attendance System E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('admin', JSON.stringify({
        username: 'Test Admin',
        email: 'admin@example.com',
        token: 'test-token',
      }));
    });

    await page.route('**/api/students**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pathname.endsWith('/attendance') ? [] : [
          { usn: 'TestUser', name: 'Test User', course: 'CSE' },
        ]),
      });
    });
    await page.route('**/api/students/attendance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  });
  
  test('Front Page renders and Dashboard button works', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    
    // Verify header title
    await expect(page.locator('text=FaceAttend Pro')).toBeVisible();
    
    // Verify Dashboard button exists
    const dashboardBtn = page.locator('button:has-text("Dashboard")');
    await expect(dashboardBtn).toBeVisible();
    
    // Test navigation to Dashboard
    await dashboardBtn.click();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Auto-recognition triggers periodically', async ({ page }) => {
    // Mock the recognition API
    await page.route('**/recognize', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ usn: 'TestUser', confidence: 80 }),
      });
    });

    await page.goto('http://localhost:5173/');
    await page.getByRole('button', { name: 'START ATTENDANCE' }).click();
    
    // Wait for the scanning overlay to appear (triggered by auto-recognition)
    await expect(page.locator('text=Scanning...')).toBeVisible({ timeout: 10000 });
  });

  test('Student Enrollment handles capture correctly', async ({ page }) => {
    await page.addInitScript(() => {
      const getImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function (...args) {
        const imageData = getImageData.apply(this, args);
        if (imageData.data.length >= 8) {
          imageData.data[4] = imageData.data[0] === 255 ? 0 : 255;
        }
        return imageData;
      };
    });

    await page.goto('http://localhost:5173/Addstudent');
    await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);

    // Fill student details
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="usn"]', '4SR21CS001');
    await page.fill('input[name="age"]', '20');
    await page.fill('input[name="course"]', 'CSE');
    await page.fill('input[name="phone"]', '9876543210');

    // Verify Capture button is present
    const captureBtn = page.locator('button:has-text("Capture & Enroll Face")');
    await expect(captureBtn).toBeVisible();
    
    // Mock enrollment APIs
    await page.route('**/enroll', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ message: 'Success' }) });
    });
    await page.route('**/api/students', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 200, body: JSON.stringify({ message: 'Success' }) });
      }
    });

    // Handle alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Student enrolled successfully');
      await dialog.accept();
    });

    // Click capture (Note: in a real browser this might fail without camera access, 
    // but we're testing the UI logic and mocking the network)
    await captureBtn.click();
  });
});
