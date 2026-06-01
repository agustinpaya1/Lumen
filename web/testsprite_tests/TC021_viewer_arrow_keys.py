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
        await page.evaluate("""() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
        }""")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)

        cards = page.locator(".photo-card")
        if await cards.count() < 2:
            print(f"SKIP: need ≥2 photos, found {await cards.count()}")
            return

        await cards.first.click()
        await page.locator(".photo-viewer-overlay").wait_for(state="visible", timeout=5000)
        src_before = await page.locator("img.viewer-photo").get_attribute("src")

        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(300)

        src_after = await page.locator("img.viewer-photo").get_attribute("src")
        assert src_after != src_before, f"Photo src unchanged after ArrowRight"
        await expect(page.locator(".photo-viewer-overlay")).to_be_visible()
        print("PASS")
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
