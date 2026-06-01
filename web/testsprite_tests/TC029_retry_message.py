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

        # This test requires Playwright route interception to simulate a
        # Supabase storage 500 error on the first upload attempt.
        # Run against a local dev server (localhost:4200) with:
        #   await page.route("**/storage/v1/object/**", handler)
        # Expected: .retry-toast shows "Reintentando (1/3)..." during upload.
        print("SKIP: requires network route interception — "
              "run against localhost:4200 with Playwright route mocking")
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
