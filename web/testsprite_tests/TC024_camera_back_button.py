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

        ctx_denied = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            permissions=[],
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

            btn = page2.locator("button:has-text('Volver a la galería')")
            await btn.wait_for(state="visible", timeout=6000)
            await btn.click()
            await page2.wait_for_url("**/home**", timeout=TIMEOUT)
            await expect(page2.locator("button:has-text('Galería Global')")).to_be_visible(timeout=5000)
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
