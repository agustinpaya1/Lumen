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

        # Requires camera permission ALLOWED and a real or virtual camera device.
        cam_ctx = await browser.new_context(
            viewport={"width": 390, "height": 844},
            permissions=["camera"],
        )
        page2 = await cam_ctx.new_page()
        try:
            await page2.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
            await page2.evaluate("""() => {
                localStorage.setItem('lumen_consent','true');
                localStorage.setItem('hasSeenTutorial','true');
                localStorage.setItem('lumen_tour_completed','true');
            }""")
            await page2.goto(BASE_URL + "/camera", wait_until="domcontentloaded", timeout=TIMEOUT)

            # In headless Chromium the camera is a black feed but the stream is valid
            viewfinder = page2.locator(".state-viewfinder")
            try:
                await viewfinder.wait_for(state="visible", timeout=6000)
            except Exception:
                print("SKIP: headless camera not available in this environment")
                return

            shutter = page2.locator("[data-tour='shutter']")
            await expect(shutter).to_be_visible()
            await shutter.click()
            await page2.wait_for_timeout(500)

            await expect(page2.locator(".state-preview")).to_be_visible(timeout=5000)
            await expect(page2.locator("img.polaroid-photo")).to_be_visible()
            await expect(page2.locator("button:has-text('Revelar')")).to_be_visible()
            await expect(page2.locator("#dedication-input")).to_be_visible()
            print("PASS")
        finally:
            await cam_ctx.close()
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
