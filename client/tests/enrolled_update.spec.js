import { test, expect } from '@playwright/test';

test.describe('Enrolled Page - Update Face Feature', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('admin', JSON.stringify({
        username: 'Test Admin',
        email: 'admin@example.com',
        token: 'test-token',
      }));
    });

    // Mock the students and attendance APIs
    await page.route('**/api/students**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pathname.endsWith('/attendance') ? [] : [
          { _id: '1', name: 'John Doe', usn: '4SR21CS001', course: 'CSE', phone: '9876543210', age: '20', enrolledAt: new Date().toISOString() }
        ]),
      });
    });

    await page.goto('http://localhost:5173/Enrolled');
  });

  test('should open student details and show update face button', async ({ page }) => {
    // Simplest possible selector to find the student and open details
    await expect(page.locator('text=John Doe')).toBeVisible({ timeout: 15000 });
    
    // Find any button in the same row or just click the first chevron/action button if it's the only one
    await page.locator('table tr button').first().click();
    
    // Check if the details modal is open
    await expect(page.locator('h2').filter({ hasText: 'John Doe' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Update Face Recognition' })).toBeVisible();
  });

  test('should activate camera and update face successfully', async ({ page }) => {
    await expect(page.locator('text=John Doe')).toBeVisible({ timeout: 15000 });
    await page.locator('table tr button').first().click();
    
    await page.getByRole('button', { name: 'Update Face Recognition' }).click();

    // Verify video element is present
    await expect(page.locator('video')).toBeVisible();
    await page.waitForFunction(() => document.querySelector('.fixed video')?.readyState >= 2);

    // Mock the enrollment update API
    await page.route('**/enroll', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Face updated successfully!' }),
      });
    });

    // Mock alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Face updated successfully!');
      await dialog.accept();
    });

    // Click "Update Face"
    const updateFaceBtn = page.locator('button:has-text("Update Face")');
    await expect(updateFaceBtn).toBeVisible();
    await updateFaceBtn.click();

    // Verify we returned to the details view (camera closed)
    await expect(page.getByRole('button', { name: 'Update Face Recognition' })).toBeVisible();
  });
});
