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

        wa_ctx = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                "WhatsApp/23.20.74 Mobile/15E148"
            ),
        )
        page2 = await wa_ctx.new_page()
        try:
            await page2.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
            await page2.evaluate("""() => {
                localStorage.setItem('lumen_consent','true');
                localStorage.setItem('hasSeenTutorial','true');
                localStorage.setItem('lumen_tour_completed','true');
            }""")
            await page2.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
            await page2.wait_for_timeout(1000)

            banner = page2.locator("text=Para usar la cámara y ver las fotos correctamente")
            await expect(banner).to_be_visible(timeout=5000)
            print("PASS")
        finally:
            await wa_ctx.close()
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
