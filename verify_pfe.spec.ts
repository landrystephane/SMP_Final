import { test, expect } from '@playwright/test';

test('Verify New Features and UI', async ({ page }) => {
  // Login as SuperAdmin
  await page.goto('http://localhost:5173');
  await page.fill('input[type="text"]', 'superadmin');
  await page.fill('input[type="password"]', 'superadmin');
  await page.click('button[type="submit"]');

  // Check System Admin
  await page.waitForSelector('text=System Admin');
  await page.click('text=System Admin');
  await page.waitForSelector('text=ECO-HUB ADMIN');
  await page.screenshot({ path: '/home/jules/verification/system_admin.png' });

  // Check Dashboard contrast
  await page.click('a[href="/"]');
  await page.waitForSelector('text=Tableau de Bord Global');
  await page.screenshot({ path: '/home/jules/verification/dashboard_new.png' });

  // Check Users Visibility
  await page.click('a[href="/users"]');
  await page.waitForSelector('text=Gestion du Personnel');
  await page.screenshot({ path: '/home/jules/verification/users_new.png' });

  // Check Tuition Config
  await page.click('a[href="/tuition-config"]');
  // Wait a bit for load
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/jules/verification/tuition_config.png' });
});
