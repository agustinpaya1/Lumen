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
            localStorage.setItem('lumen_photos_remaining','7');
        }""")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await expect(page.locator("text=7 fotos restantes")).to_be_visible(timeout=TIMEOUT)
        cls7 = await page.locator(".header-subtitle").get_attribute("class")
        assert "text-gray-500" in (cls7 or ""), f"Expected gray for 7 remaining: {cls7}"

        await page.evaluate("localStorage.setItem('lumen_photos_remaining','2')")
        await page.reload(wait_until="domcontentloaded")
        await expect(page.locator("text=2 fotos restantes")).to_be_visible(timeout=TIMEOUT)
        cls2 = await page.locator(".header-subtitle").get_attribute("class")
        assert "text-orange-500" in (cls2 or ""), f"Expected orange for 2 remaining: {cls2}"

        await page.evaluate("localStorage.setItem('lumen_photos_remaining','1')")
        await page.reload(wait_until="domcontentloaded")
        await expect(page.locator("text=1 fotos restantes")).to_be_visible(timeout=TIMEOUT)
        cls1 = await page.locator(".header-subtitle").get_attribute("class")
        assert "text-red-500" in (cls1 or ""), f"Expected red for 1 remaining: {cls1}"
        print("PASS")
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
