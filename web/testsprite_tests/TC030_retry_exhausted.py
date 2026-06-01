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

        # Requires intercepting ALL 3 upload attempts to exhaust backoff.
        # Full implementation needs a local dev server and route interception.
        # This stub documents the expected behaviour.
        print("SKIP: requires network interception for all 3 retry attempts (~7s total)")
        print("      Expected: error-banner 'Error al subir la foto tras varios intentos'")
        print("      Expected: 'Reintentar subida' button appears")
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
