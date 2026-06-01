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
            localStorage.removeItem('lumen_event_key');
        }""")
        await page.goto(BASE_URL + "/home?e=test-isolated-event-xyz", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_timeout(1000)

        stored = await page.evaluate("localStorage.getItem('lumen_event_key')")
        assert stored == "test-isolated-event-xyz", f"Event key not stored: {stored}"

        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        stored2 = await page.evaluate("localStorage.getItem('lumen_event_key')")
        assert stored2 == "test-isolated-event-xyz", f"Event key not persisted: {stored2}"

        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)
        print("PASS")
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
