"""
Generates one self-contained TC*.py per test case.
Run once; delete this file afterwards.
"""
import os
import textwrap

DIR = os.path.dirname(os.path.abspath(__file__))
BASE_URL = "https://lumen-umber.vercel.app"

HEADER = '''import asyncio
from playwright import async_api
from playwright.async_api import expect

BASE_URL = "{base_url}"
TIMEOUT = 15_000


async def run_test():
    pw = browser = context = page = None
    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=["--window-size=1280,720", "--disable-dev-shm-usage", "--ipc=host"],
        )
        context = await browser.new_context(viewport={{"width": 1280, "height": 720}})
        page = await context.new_page()

'''.format(base_url=BASE_URL)

FOOTER = '''
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
'''

# ---------------------------------------------------------------------------
# Each entry: (filename_stem, body_lines_as_string)
# Body is indented inside run_test's try block (8 spaces).
# ---------------------------------------------------------------------------

def body(s):
    """Strip outer indentation so we can write naturally below."""
    return textwrap.dedent(s)


TESTS = [

# TC001 ─────────────────────────────────────────────────────────────────────
("TC001_splash_branding", body("""
        # Setup: consent given, tutorial not yet seen
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate("localStorage.setItem('lumen_consent','true')")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)

        await expect(page.locator("img[alt='Natacha y Lucas']")).to_be_visible(timeout=TIMEOUT)
        await expect(page.locator("button:has-text('Entrar a la galería')")).to_be_visible()
        await expect(page.locator("h1")).to_contain_text("Natacha y Lucas")
        await expect(page.locator("[role='dialog']")).not_to_be_visible()
        print("PASS")
""")),

# TC002 ─────────────────────────────────────────────────────────────────────
("TC002_entry_button", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate("localStorage.setItem('lumen_consent','true')")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)

        await page.locator("button:has-text('Entrar a la galería')").click()
        await page.wait_for_url("**/home**", timeout=TIMEOUT)
        await expect(page.locator("button:has-text('Galería Global')")).to_be_visible(timeout=TIMEOUT)
        await expect(page.locator("button:has-text('Mis Fotos')")).to_be_visible()
        print("PASS")
""")),

# TC003 ─────────────────────────────────────────────────────────────────────
("TC003_returning_user", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
        }\"\"\")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)

        await page.wait_for_url("**/home**", timeout=TIMEOUT)
        await expect(page.locator("button:has-text('Galería Global')")).to_be_visible(timeout=5000)
        await expect(page.locator("text=Entrar a la galería")).not_to_be_visible()
        print("PASS")
""")),

# TC004 ─────────────────────────────────────────────────────────────────────
("TC004_rapid_double_tap", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate("localStorage.setItem('lumen_consent','true')")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)

        btn = page.locator("button:has-text('Entrar a la galería')")
        await btn.wait_for(state="visible", timeout=TIMEOUT)
        await btn.click()
        try:
            await btn.click(timeout=500)
        except Exception:
            pass  # already navigated — fine
        await page.wait_for_url("**/home**", timeout=TIMEOUT)
        await expect(page.locator(".error-banner")).not_to_be_visible()
        print("PASS")
""")),

# TC005 ─────────────────────────────────────────────────────────────────────
("TC005_tab_switch", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
        }\"\"\")
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
""")),

# TC006 ─────────────────────────────────────────────────────────────────────
("TC006_open_viewer", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
        }\"\"\")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)

        if not await page.locator(".photo-grid").is_visible():
            print("SKIP: gallery is empty")
            return

        await page.locator(".photo-card").first.click()
        await expect(page.locator(".photo-viewer-overlay")).to_be_visible(timeout=5000)
        await expect(page.locator("img.viewer-photo")).to_be_visible()
        await expect(page.locator("button:has-text('Guardar')")).to_be_visible()
        await expect(page.locator("[aria-label='Cerrar']")).to_be_visible()
        print("PASS")
""")),

# TC007 ─────────────────────────────────────────────────────────────────────
("TC007_close_viewer", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
        }\"\"\")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)

        if not await page.locator(".photo-grid").is_visible():
            print("SKIP: gallery is empty")
            return

        await page.locator(".photo-card").first.click()
        await page.locator(".photo-viewer-overlay").wait_for(state="visible", timeout=5000)
        await page.locator("[aria-label='Cerrar']").click()
        await expect(page.locator(".photo-viewer-overlay")).not_to_be_visible(timeout=4000)
        await expect(page.locator(".photo-grid")).to_be_visible()
        print("PASS")
""")),

# TC008 ─────────────────────────────────────────────────────────────────────
("TC008_delete_owned_photo", body("""
        # Requires: SEEDED_OWNER_DEVICE_ID set as env var, and that device_id
        # owns at least one photo in the demo event.
        import os
        device_id = os.environ.get("SEEDED_OWNER_DEVICE_ID")
        if not device_id:
            print("SKIP: set SEEDED_OWNER_DEVICE_ID env var to run this test")
            return

        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(f\"\"\"() => {{
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
            localStorage.setItem('lumen_device_id','{device_id}');
        }}\"\"\")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_selector(".photo-grid", timeout=TIMEOUT)

        await page.locator(".photo-card").first.click()
        await expect(page.locator("button:has-text('Borrar')")).to_be_visible(timeout=5000)

        await page.locator("button:has-text('Borrar')").click()
        await expect(page.locator(".viewer-confirm-box")).to_be_visible()
        await expect(page.locator("text=¿Seguro que quieres borrarla?")).to_be_visible()

        await page.locator("button:has-text('Sí, borrar')").click()
        await expect(page.locator(".photo-viewer-overlay")).not_to_be_visible(timeout=6000)
        print("PASS")
""")),

# TC009 ─────────────────────────────────────────────────────────────────────
("TC009_cancel_delete", body("""
        import os
        device_id = os.environ.get("SEEDED_OWNER_DEVICE_ID")
        if not device_id:
            print("SKIP: set SEEDED_OWNER_DEVICE_ID env var to run this test")
            return

        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(f\"\"\"() => {{
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
            localStorage.setItem('lumen_device_id','{device_id}');
        }}\"\"\")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_selector(".photo-grid", timeout=TIMEOUT)

        await page.locator(".photo-card").first.click()
        await page.locator("button:has-text('Borrar')").click()
        await expect(page.locator(".viewer-confirm-box")).to_be_visible()

        await page.locator("button:has-text('Cancelar')").click()
        await expect(page.locator(".photo-viewer-overlay")).to_be_visible()
        await expect(page.locator(".viewer-confirm-box")).not_to_be_visible()
        await expect(page.locator("img.viewer-photo")).to_be_visible()
        print("PASS")
""")),

# TC010 ─────────────────────────────────────────────────────────────────────
("TC010_admin_pin_login", body("""
        await page.goto(BASE_URL + "/admin", wait_until="domcontentloaded", timeout=TIMEOUT)

        await expect(page.locator("text=Admin Access")).to_be_visible(timeout=TIMEOUT)
        pin = page.locator("input[placeholder='Enter 4-digit PIN']")
        await expect(pin).to_be_visible()
        await pin.fill("2102")
        await page.locator("button:has-text('Unlock Dashboard')").click()

        await expect(page.locator("text=Photo Dashboard")).to_be_visible(timeout=5000)
        await expect(page.locator("button:has-text('Logout')")).to_be_visible()
        await expect(page.locator(".dashboard")).to_be_visible()
        print("PASS")
""")),

# TC011 ─────────────────────────────────────────────────────────────────────
("TC011_admin_delete", body("""
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
        await page.locator(".btn-danger:has-text('Delete')").click()
        await expect(page.locator(".modal-overlay")).not_to_be_visible(timeout=5000)

        after = await page.locator(".photo-card").count()
        assert after == before - 1, f"Expected {before - 1} cards, got {after}"
        print("PASS")
""")),

# TC012 ─────────────────────────────────────────────────────────────────────
("TC012_admin_cancel_delete", body("""
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
""")),

# TC013 ─────────────────────────────────────────────────────────────────────
("TC013_consent_first_visit", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)

        await expect(page.locator("[role='dialog'][aria-labelledby='consent-title']")).to_be_visible(timeout=TIMEOUT)
        await expect(page.locator("text=Antes de continuar")).to_be_visible()
        await expect(page.locator("button:has-text('Entendido, continuar')")).to_be_visible()
        await expect(page.locator("button:has-text('No acepto')")).to_be_visible()
        await expect(page.locator("text=identificador anónimo")).to_be_visible()
        print("PASS")
""")),

# TC014 ─────────────────────────────────────────────────────────────────────
("TC014_consent_decline", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.locator("[role='dialog']").wait_for(state="visible", timeout=TIMEOUT)

        await page.locator("button:has-text('No acepto')").click()
        await expect(page.locator("text=Para usar esta aplicación es necesario aceptar")).to_be_visible(timeout=5000)
        await expect(page.locator("[role='dialog']")).not_to_be_visible()
        await expect(page.locator("text=Entrar a la galería")).not_to_be_visible()
        await expect(page.locator("text=Si cambias de opinión, recarga la página.")).to_be_visible()
        print("PASS")
""")),

# TC015 ─────────────────────────────────────────────────────────────────────
("TC015_consent_accept", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.locator("[role='dialog']").wait_for(state="visible", timeout=TIMEOUT)

        await page.locator("button:has-text('Entendido, continuar')").click()
        await expect(page.locator("[role='dialog']")).not_to_be_visible(timeout=4000)
        await expect(page.locator("button:has-text('Entrar a la galería')")).to_be_visible(timeout=4000)
        val = await page.evaluate("localStorage.getItem('lumen_consent')")
        assert val == "true", f"lumen_consent not set, got: {val}"
        print("PASS")
""")),

# TC016 ─────────────────────────────────────────────────────────────────────
("TC016_tour_appears", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.removeItem('lumen_tour_completed');
            localStorage.removeItem('lumen_event_key');
        }\"\"\")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_timeout(1500)

        await expect(page.locator(".lumen-tour")).to_be_visible(timeout=6000)
        await expect(page.locator("text=Paso 1 de 6")).to_be_visible()
        await expect(page.locator("text=Galería en tiempo real")).to_be_visible()
        await expect(page.locator("button:has-text('Saltar tour')")).to_be_visible()
        await expect(page.locator("button:has-text('Siguiente')")).to_be_visible()
        print("PASS")
""")),

# TC017 ─────────────────────────────────────────────────────────────────────
("TC017_tour_skip", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.removeItem('lumen_tour_completed');
            localStorage.removeItem('lumen_event_key');
        }\"\"\")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.locator(".lumen-tour").wait_for(state="visible", timeout=8000)

        await page.locator("button:has-text('Saltar tour')").click()
        await expect(page.locator(".lumen-tour")).not_to_be_visible(timeout=3000)
        val = await page.evaluate("localStorage.getItem('lumen_tour_completed')")
        assert val == "true", f"lumen_tour_completed not persisted, got: {val}"
        print("PASS")
""")),

# TC018 ─────────────────────────────────────────────────────────────────────
("TC018_tour_all_steps", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.removeItem('lumen_tour_completed');
            localStorage.removeItem('lumen_event_key');
        }\"\"\")
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
""")),

# TC019 ─────────────────────────────────────────────────────────────────────
("TC019_tour_escape_key", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.removeItem('lumen_tour_completed');
            localStorage.removeItem('lumen_event_key');
        }\"\"\")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.locator(".lumen-tour").wait_for(state="visible", timeout=8000)

        await page.keyboard.press("Escape")
        await expect(page.locator(".lumen-tour")).not_to_be_visible(timeout=3000)
        val = await page.evaluate("localStorage.getItem('lumen_tour_completed')")
        assert val == "true", f"lumen_tour_completed not set after Escape: {val}"
        print("PASS")
""")),

# TC020 ─────────────────────────────────────────────────────────────────────
("TC020_tour_no_repeat", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
            localStorage.removeItem('lumen_event_key');
        }\"\"\")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_timeout(1500)

        await expect(page.locator(".lumen-tour")).not_to_be_visible()
        await expect(page.locator(".home-container")).to_be_visible(timeout=5000)
        print("PASS")
""")),

# TC021 ─────────────────────────────────────────────────────────────────────
("TC021_viewer_arrow_keys", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
        }\"\"\")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)

        cards = page.locator(".photo-card")
        if await cards.count() < 2:
            print(f"SKIP: need ≥2 photos, found {await cards.count()}")
            return

        await cards.first.click()
        await page.locator(".photo-viewer-overlay").wait_for(state="visible", timeout=5000)
        src_before = await page.locator("img.viewer-photo").get_attribute("src")

        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(300)

        src_after = await page.locator("img.viewer-photo").get_attribute("src")
        assert src_after != src_before, f"Photo src unchanged after ArrowRight"
        await expect(page.locator(".photo-viewer-overlay")).to_be_visible()
        print("PASS")
""")),

# TC022 ─────────────────────────────────────────────────────────────────────
("TC022_viewer_swipe", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
        }\"\"\")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)

        cards = page.locator(".photo-card")
        if await cards.count() < 2:
            print(f"SKIP: need ≥2 photos, found {await cards.count()}")
            return

        await cards.first.click()
        overlay = page.locator(".photo-viewer-overlay")
        await overlay.wait_for(state="visible", timeout=5000)
        src_before = await page.locator("img.viewer-photo").get_attribute("src")

        # Left swipe: touchstart x=300, touchend x=150  (deltaX = -150 > 50 threshold)
        await page.touchscreen.tap(300, 400)
        await overlay.dispatch_event("touchstart", {"changedTouches": [{"clientX": 300, "clientY": 400}]})
        await overlay.dispatch_event("touchend",   {"changedTouches": [{"clientX": 150, "clientY": 400}]})
        await page.wait_for_timeout(300)

        src_after = await page.locator("img.viewer-photo").get_attribute("src")
        assert src_after != src_before, "Photo src unchanged after left swipe"
        print("PASS")
""")),

# TC023 ─────────────────────────────────────────────────────────────────────
("TC023_camera_permission_denied", body("""
        # Note: browser context must be created with camera permission DENIED.
        # This file re-creates its own context for that purpose.
        ctx_denied = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            permissions=[],   # camera not granted
        )
        page2 = await ctx_denied.new_page()
        try:
            await page2.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
            await page2.evaluate(\"\"\"() => {
                localStorage.setItem('lumen_consent','true');
                localStorage.setItem('hasSeenTutorial','true');
                localStorage.setItem('lumen_tour_completed','true');
            }\"\"\")
            await page2.goto(BASE_URL + "/camera", wait_until="domcontentloaded", timeout=TIMEOUT)
            await page2.wait_for_timeout(3000)

            await expect(page2.locator(".permission-helper-overlay")).to_be_visible(timeout=6000)
            await expect(page2.locator("text=Acceso a la cámara bloqueado")).to_be_visible()
            await expect(page2.locator("button:has-text('Volver a la galería')")).to_be_visible()
            print("PASS")
        finally:
            await ctx_denied.close()
""")),

# TC024 ─────────────────────────────────────────────────────────────────────
("TC024_camera_back_button", body("""
        ctx_denied = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            permissions=[],
        )
        page2 = await ctx_denied.new_page()
        try:
            await page2.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
            await page2.evaluate(\"\"\"() => {
                localStorage.setItem('lumen_consent','true');
                localStorage.setItem('hasSeenTutorial','true');
                localStorage.setItem('lumen_tour_completed','true');
            }\"\"\")
            await page2.goto(BASE_URL + "/camera", wait_until="domcontentloaded", timeout=TIMEOUT)
            await page2.wait_for_timeout(3000)

            btn = page2.locator("button:has-text('Volver a la galería')")
            await btn.wait_for(state="visible", timeout=6000)
            await btn.click()
            await page2.wait_for_url("**/home**", timeout=TIMEOUT)
            await expect(page2.locator("button:has-text('Galería Global')")).to_be_visible(timeout=5000)
            print("PASS")
        finally:
            await ctx_denied.close()
""")),

# TC025 ─────────────────────────────────────────────────────────────────────
("TC025_photo_counter", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
            localStorage.setItem('lumen_photos_remaining','7');
        }\"\"\")
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
""")),

# TC026 ─────────────────────────────────────────────────────────────────────
("TC026_limit_blocked", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
            localStorage.setItem('lumen_photos_remaining','0');
        }\"\"\")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await expect(page.locator("text=0 fotos restantes")).to_be_visible(timeout=TIMEOUT)

        await page.locator("[data-tour='camera-fab']").click()
        await expect(page.locator(".limit-modal-content")).to_be_visible(timeout=3000)
        await expect(page.locator("text=¡Vaya! Carrete lleno")).to_be_visible()
        await expect(page.locator("button:has-text('Ir a mi Galería y liberar espacio')")).to_be_visible()
        assert "/camera" not in page.url, f"Unexpectedly navigated to camera: {page.url}"
        print("PASS")
""")),

# TC027 ─────────────────────────────────────────────────────────────────────
("TC027_limit_modal_cta", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
            localStorage.setItem('lumen_photos_remaining','0');
        }\"\"\")
        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.locator("[data-tour='camera-fab']").click()
        await page.locator(".limit-modal-content").wait_for(state="visible", timeout=3000)

        await page.locator("button:has-text('Ir a mi Galería y liberar espacio')").click()
        await expect(page.locator(".limit-modal-content")).not_to_be_visible(timeout=3000)
        personal_btn = page.locator("button:has-text('Mis Fotos')")
        cls = await personal_btn.get_attribute("class")
        assert "active" in (cls or ""), f"'Mis Fotos' not active after CTA: {cls}"
        print("PASS")
""")),

# TC028 ─────────────────────────────────────────────────────────────────────
("TC028_event_key_param", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
            localStorage.removeItem('lumen_event_key');
        }\"\"\")
        await page.goto(BASE_URL + "/home?e=test-isolated-event-xyz", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_timeout(1000)

        stored = await page.evaluate("localStorage.getItem('lumen_event_key')")
        assert stored == "test-isolated-event-xyz", f"Event key not stored: {stored}"

        await page.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        stored2 = await page.evaluate("localStorage.getItem('lumen_event_key')")
        assert stored2 == "test-isolated-event-xyz", f"Event key not persisted: {stored2}"

        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)
        print("PASS")
""")),

# TC029 ─────────────────────────────────────────────────────────────────────
("TC029_retry_message", body("""
        # This test requires Playwright route interception to simulate a
        # Supabase storage 500 error on the first upload attempt.
        # Run against a local dev server (localhost:4200) with:
        #   await page.route("**/storage/v1/object/**", handler)
        # Expected: .retry-toast shows "Reintentando (1/3)..." during upload.
        print("SKIP: requires network route interception — "
              "run against localhost:4200 with Playwright route mocking")
""")),

# TC030 ─────────────────────────────────────────────────────────────────────
("TC030_retry_exhausted", body("""
        # Requires intercepting ALL 3 upload attempts to exhaust backoff.
        # Full implementation needs a local dev server and route interception.
        # This stub documents the expected behaviour.
        print("SKIP: requires network interception for all 3 retry attempts (~7s total)")
        print("      Expected: error-banner 'Error al subir la foto tras varios intentos'")
        print("      Expected: 'Reintentar subida' button appears")
""")),

# TC031 ─────────────────────────────────────────────────────────────────────
("TC031_inapp_browser", body("""
        wa_ctx = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                "WhatsApp/23.20.74 Mobile/15E148"
            ),
        )
        page2 = await wa_ctx.new_page()
        try:
            await page2.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
            await page2.evaluate(\"\"\"() => {
                localStorage.setItem('lumen_consent','true');
                localStorage.setItem('hasSeenTutorial','true');
                localStorage.setItem('lumen_tour_completed','true');
            }\"\"\")
            await page2.goto(BASE_URL + "/home", wait_until="domcontentloaded", timeout=TIMEOUT)
            await page2.wait_for_timeout(1000)

            banner = page2.locator("text=Para usar la cámara y ver las fotos correctamente")
            await expect(banner).to_be_visible(timeout=5000)
            print("PASS")
        finally:
            await wa_ctx.close()
""")),

# TC032 ─────────────────────────────────────────────────────────────────────
("TC032_guardar_download", body("""
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("localStorage.clear(); sessionStorage.clear()")
        await page.evaluate(\"\"\"() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
        }\"\"\")
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
""")),

# TC033 ─────────────────────────────────────────────────────────────────────
("TC033_admin_wrong_pin", body("""
        await page.goto(BASE_URL + "/admin", wait_until="domcontentloaded", timeout=TIMEOUT)

        pin = page.locator("input[placeholder='Enter 4-digit PIN']")
        await pin.wait_for(state="visible", timeout=TIMEOUT)
        await pin.fill("0000")
        await page.locator("button:has-text('Unlock Dashboard')").click()

        await expect(page.locator("text=Invalid PIN. Please try again.")).to_be_visible(timeout=3000)
        await expect(page.locator("text=Photo Dashboard")).not_to_be_visible()
        print("PASS")
""")),

# TC034 ─────────────────────────────────────────────────────────────────────
("TC034_camera_capture", body("""
        # Requires camera permission ALLOWED and a real or virtual camera device.
        cam_ctx = await browser.new_context(
            viewport={"width": 390, "height": 844},
            permissions=["camera"],
        )
        page2 = await cam_ctx.new_page()
        try:
            await page2.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
            await page2.evaluate(\"\"\"() => {
                localStorage.setItem('lumen_consent','true');
                localStorage.setItem('hasSeenTutorial','true');
                localStorage.setItem('lumen_tour_completed','true');
            }\"\"\")
            await page2.goto(BASE_URL + "/camera", wait_until="domcontentloaded", timeout=TIMEOUT)

            # In headless Chromium the camera is a black feed but the stream is valid
            viewfinder = page2.locator(".state-viewfinder")
            try:
                await viewfinder.wait_for(state="visible", timeout=6000)
            except Exception:
                print("SKIP: headless camera not available in this environment")
                return

            shutter = page2.locator("[data-tour='shutter']")
            await expect(shutter).to_be_visible()
            await shutter.click()
            await page2.wait_for_timeout(500)

            await expect(page2.locator(".state-preview")).to_be_visible(timeout=5000)
            await expect(page2.locator("img.polaroid-photo")).to_be_visible()
            await expect(page2.locator("button:has-text('Revelar')")).to_be_visible()
            await expect(page2.locator("#dedication-input")).to_be_visible()
            print("PASS")
        finally:
            await cam_ctx.close()
""")),

]  # end TESTS list


def make_file(stem: str, body_str: str) -> str:
    # body_str is already stripped of outer indent; re-indent to 8 spaces
    lines = body_str.split("\n")
    # trim leading/trailing blank lines
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    indented = "\n".join("        " + ln if ln.strip() else "" for ln in lines)
    return HEADER + indented + FOOTER


for stem, body_str in TESTS:
    path = os.path.join(DIR, stem + ".py")
    with open(path, "w") as f:
        f.write(make_file(stem, body_str))
    print(f"  wrote {stem}.py")

print(f"\n✅  {len(TESTS)} files generated in {DIR}")
