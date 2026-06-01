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

        import os
        device_id = os.environ.get("SEEDED_OWNER_DEVICE_ID")
        if not device_id:
            print("SKIP: set SEEDED_OWNER_DEVICE_ID env var to run this test")
            return

        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(f"""() => {{
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
            localStorage.setItem('lumen_device_id','{device_id}');
        }}""")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_selector(".photo-grid", timeout=TIMEOUT)

        await page.locator(".photo-card").first.click()
        await page.locator("button:has-text('Borrar')").click()
        await expect(page.locator(".viewer-confirm-box")).to_be_visible()

        await page.locator("button:has-text('Cancelar')").click()
        await expect(page.locator(".photo-viewer-overlay")).to_be_visible()
        await expect(page.locator(".viewer-confirm-box")).not_to_be_visible()
        await expect(page.locator("img.viewer-photo")).to_be_visible()
        print("PASS")
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
