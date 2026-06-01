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

        await page.goto(BASE_URL + "/admin", wait_until="domcontentloaded", timeout=TIMEOUT)

        pin = page.locator("input[placeholder='Enter 4-digit PIN']")
        await pin.wait_for(state="visible", timeout=TIMEOUT)
        await pin.fill("0000")
        await page.locator("button:has-text('Unlock Dashboard')").click()

        await expect(page.locator("text=Invalid PIN. Please try again.")).to_be_visible(timeout=3000)
        await expect(page.locator("text=Photo Dashboard")).not_to_be_visible()
        print("PASS")
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
