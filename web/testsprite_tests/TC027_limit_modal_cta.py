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
            localStorage.setItem('lumen_photos_remaining','0');
        }""")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.locator("[data-tour='camera-fab']").click()
        await page.locator(".limit-modal-content").wait_for(state="visible", timeout=3000)

        await page.locator("button:has-text('Ir a mi Galería y liberar espacio')").click()
        await expect(page.locator(".limit-modal-content")).not_to_be_visible(timeout=3000)
        personal_btn = page.locator("button:has-text('Mis Fotos')")
        cls = await personal_btn.get_attribute("class")
        assert "active" in (cls or ""), f"'Mis Fotos' not active after CTA: {cls}"
        print("PASS")
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
