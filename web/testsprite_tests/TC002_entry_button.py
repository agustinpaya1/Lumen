import asyncio
from playwright import async_api
from playwright.async_api import expect

BASE_URL = "https://lumen-umber.vercel.app"
TIMEOUT = 15_000


async def run_test():
    pw = browser = context = page = None
    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=["--window-size=1280,720", "--disable-dev-shm-usage", "--ipc=host"],
        )
        context = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await context.new_page()

        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate("localStorage.setItem('lumen_consent','true')")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)

        await page.locator("button:has-text('Entrar a la galería')").click()
        await page.wait_for_url("**/home**", timeout=TIMEOUT)
        await expect(page.locator("button:has-text('Galería Global')")).to_be_visible(timeout=TIMEOUT)
        await expect(page.locator("button:has-text('Mis Fotos')")).to_be_visible()
        print("PASS")
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
