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

        global_btn = page.locator("button:has-text('Galería Global')")
        personal_btn = page.locator("button:has-text('Mis Fotos')")
        await expect(global_btn).to_be_visible(timeout=TIMEOUT)
        await expect(personal_btn).to_be_visible()

        await personal_btn.click()
        await page.wait_for_timeout(300)
        personal_cls = await personal_btn.get_attribute("class")
        assert "active" in (personal_cls or ""), f"Mis Fotos lacks active class: {personal_cls}"

        await global_btn.click()
        await page.wait_for_timeout(300)
        global_cls = await global_btn.get_attribute("class")
        assert "active" in (global_cls or ""), f"Galería Global lacks active class: {global_cls}"
        print("PASS")
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
