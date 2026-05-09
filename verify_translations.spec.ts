import { test, expect } from '@playwright/test';

test('verify attendance and admin workflow translations', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Login
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');

  // Wait for dashboard
  await page.waitForSelector('text=Dashboard');

  // Go to Admin Workflow
  await page.click('text=Access Control');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'admin_workflow_en.png' });

  // Switch to French
  await page.click('button:has-text("PASSER AU FRANÇAIS")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'admin_workflow_fr.png' });

  // Go to Attendance
  await page.click('text=Cahier de Présence');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'attendance_fr.png' });
});
