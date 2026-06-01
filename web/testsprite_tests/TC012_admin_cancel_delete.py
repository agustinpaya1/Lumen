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
        await page.locator("input[placeholder='Enter 4-digit PIN']").fill("2102")
        await page.locator("button:has-text('Unlock Dashboard')").click()
        await page.locator(".dashboard").wait_for(state="visible", timeout=TIMEOUT)
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)

        if not await page.locator(".photo-grid").is_visible():
            print("SKIP: no photos in admin dashboard")
            return

        before = await page.locator(".photo-card").count()
        await page.locator(".btn-delete").first.click()
        await expect(page.locator("text=Delete Photo?")).to_be_visible(timeout=4000)
        await page.locator(".btn-secondary:has-text('Cancel')").click()
        await expect(page.locator(".modal-overlay")).not_to_be_visible(timeout=3000)

        after = await page.locator(".photo-card").count()
        assert after == before, f"Count changed after cancel: {before} → {after}"
        print("PASS")
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
