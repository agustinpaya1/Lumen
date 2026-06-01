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
            localStorage.removeItem('lumen_tour_completed');
            localStorage.removeItem('lumen_event_key');
        }""")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.locator(".lumen-tour").wait_for(state="visible", timeout=8000)

        steps = [
            ("Paso 1 de 6", "Galería en tiempo real"),
            ("Paso 2 de 6", "Tu carrete personal"),
            ("Paso 3 de 6", "Abre la cámara"),
            ("Paso 4 de 6", "Dispara"),
            ("Paso 5 de 6", "Toca para ampliar"),
            ("Paso 6 de 6", "Todo listo"),
        ]
        for i, (paso, titulo) in enumerate(steps):
            await expect(page.locator(f"text={paso}")).to_be_visible(timeout=8000)
            await expect(page.locator(f"text={titulo}")).to_be_visible(timeout=4000)
            if i < len(steps) - 1:
                await page.locator("button:has-text('Siguiente')").click()
                await page.wait_for_timeout(800)
            else:
                await expect(page.locator("button:has-text('Empezar a explorar')")).to_be_visible()
                await expect(page.locator("button:has-text('Saltar tour')")).not_to_be_visible()
                await page.locator("button:has-text('Empezar a explorar')").click()

        await expect(page.locator(".lumen-tour")).not_to_be_visible(timeout=3000)
        print("PASS")
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
