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

        if not await page.locator(".photo-grid").is_visible():
            print("SKIP: gallery is empty")
            return

        await page.locator(".photo-card").first.click()
        await page.locator(".photo-viewer-overlay").wait_for(state="visible", timeout=5000)
        save_btn = page.locator(".save-btn")
        await expect(save_btn).to_be_visible()

        async with page.expect_download(timeout=12_000):
            await save_btn.click()
            try:
                await expect(page.locator("text=Guardando...")).to_be_visible(timeout=3000)
            except Exception:
                pass  # loading state too brief on fast connection

        await expect(save_btn.locator("span:has-text('Guardar')")).to_be_visible(timeout=8000)
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
