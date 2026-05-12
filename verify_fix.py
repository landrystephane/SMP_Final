import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        print("Accès à la page de login...")
        await page.goto("http://localhost:5177")
        await page.wait_for_selector('input[placeholder="Admin"]')

        print("Saisie des identifiants (admin/admin)...")
        await page.fill('input[placeholder="Admin"]', 'admin')
        await page.fill('input[type="password"]', 'admin')

        print("Clic sur le bouton de connexion...")
        await page.click('button[type="submit"]')

        print("Attente de la redirection vers le Dashboard...")
        # Attendre que le texte 'Tableau de Bord Global' apparaisse
        try:
            await page.wait_for_selector('text=Tableau de Bord Global', timeout=10000)
            print("Dashboard chargé avec succès !")
            await page.screenshot(path="dashboard_success.png")
        except Exception as e:
            print(f"Erreur ou timeout: {e}")
            await page.screenshot(path="debug_fix_error.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
