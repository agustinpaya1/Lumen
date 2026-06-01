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

        # Note: browser context must be created with camera permission DENIED.
        # This file re-creates its own context for that purpose.
        ctx_denied = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            permissions=[],   # camera not granted
        )
        page2 = await ctx_denied.new_page()
        try:
            await page2.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
            await page2.evaluate("""() => {
                localStorage.setItem('lumen_consent','true');
                localStorage.setItem('hasSeenTutorial','true');
                localStorage.setItem('lumen_tour_completed','true');
            }""")
            await page2.goto(BASE_URL + "/camera", wait_until="domcontentloaded", timeout=TIMEOUT)
            await page2.wait_for_timeout(3000)

            await expect(page2.locator(".permission-helper-overlay")).to_be_visible(timeout=6000)
            await expect(page2.locator("text=Acceso a la cámara bloqueado")).to_be_visible()
            await expect(page2.locator("button:has-text('Volver a la galería')")).to_be_visible()
            print("PASS")
        finally:
            await ctx_denied.close()
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
