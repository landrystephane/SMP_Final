import { test, expect } from '@playwright/test';

test('Verify AdminWorkflow and Dashboard Bilingual', async ({ page }) => {
  // Login first
  await page.goto('http://localhost:5173');
  await page.fill('input[type="text"]', 'founder1');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // Wait for dashboard
  await page.waitForSelector('text=Global Dashboard');

  // Switch to French
  await page.click('button:has-text("Switch to French")');
  await page.waitForSelector('text=Tableau de Bord Global');

  // Go to Admin Workflow
  await page.click('a[href="/admin-workflow"]');
  await page.waitForSelector('text=Contrôle Administratif');

  // Take screenshot of Admin Workflow in French
  await page.screenshot({ path: '/home/jules/verification/admin_fr.png' });

  // Verify SG acting mode text
  await expect(page.locator('text=Mode Suppléance SG')).toBeVisible();

  // Go back to Dashboard
  await page.click('a[href="/"]');
  await page.waitForSelector('text=Tableau de Bord Global');

  // Verify KPIs in French
  await expect(page.locator('text=Effectif Global')).toBeVisible();
  await expect(page.locator('text=Recouvrement Total')).toBeVisible();

  // Take screenshot of Dashboard in French
  await page.screenshot({ path: '/home/jules/verification/dashboard_fr.png' });
});
