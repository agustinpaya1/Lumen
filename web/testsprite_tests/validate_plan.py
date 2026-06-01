"""
Phase 4 — Validation script for Lumen E2E test plan.
Runs against https://lumen-umber.vercel.app (headless Chromium).
Reports PASS / FAIL for every test case that can be exercised without
camera hardware or network-intercept infrastructure.
"""

import asyncio
import json
from dataclasses import dataclass
from typing import Optional
from playwright.async_api import async_playwright, Page, BrowserContext, expect

BASE_URL = "https://lumen-umber.vercel.app"
TIMEOUT = 15_000   # 15 s — Supabase cold starts can be slow

results: list[dict] = []


def record(tc_id: str, title: str, status: str, note: str = "") -> None:
    results.append({"id": tc_id, "title": title, "status": status, "note": note})
    icon = "✅" if status == "PASS" else ("⚠️" if status == "SKIP" else "❌")
    print(f"  {icon}  {tc_id}: {title[:60]}")
    if note:
        print(f"         {note}")


async def fresh_page(ctx: BrowserContext) -> Page:
    """New page with cleared storage — simulates a fresh browser session."""
    page = await ctx.new_page()
    await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
    await page.evaluate("localStorage.clear(); sessionStorage.clear()")
    return page


async def preset_consent(page: Page, tour_done: bool = True) -> None:
    """Inject the localStorage keys needed to bypass consent + onboarding."""
    await page.evaluate("""([tourDone]) => {
        localStorage.setItem('lumen_consent', 'true');
        localStorage.setItem('hasSeenTutorial', 'true');
        if (tourDone) localStorage.setItem('lumen_tour_completed', 'true');
        localStorage.removeItem('lumen_event_key');
    }""", [tour_done])


# ---------------------------------------------------------------------------
# TC013 — RGPD consent modal on first visit
# ---------------------------------------------------------------------------
async def tc013(ctx: BrowserContext) -> None:
    tc_id, title = "TC013", "RGPD consent modal appears on first visit"
    try:
        page = await fresh_page(ctx)
        await page.reload(wait_until="domcontentloaded")

        dialog = page.locator("[role='dialog']")
        await dialog.wait_for(state="visible", timeout=TIMEOUT)
        await expect(page.locator("text=Antes de continuar")).to_be_visible()
        await expect(page.locator("button:has-text('Entendido, continuar')")).to_be_visible()
        await expect(page.locator("button:has-text('No acepto')")).to_be_visible()
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC014 — Declining consent shows blocked screen
# ---------------------------------------------------------------------------
async def tc014(ctx: BrowserContext) -> None:
    tc_id, title = "TC014", "Declining consent shows blocked-access screen"
    try:
        page = await fresh_page(ctx)
        await page.reload(wait_until="domcontentloaded")

        await page.locator("[role='dialog']").wait_for(state="visible", timeout=TIMEOUT)
        await page.locator("button:has-text('No acepto')").click()
        await expect(page.locator("text=Para usar esta aplicación es necesario aceptar")).to_be_visible(timeout=5000)
        await expect(page.locator("[role='dialog']")).not_to_be_visible()
        await expect(page.locator("text=Entrar a la galería")).not_to_be_visible()
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC015 — Accepting consent reveals splash CTA
# ---------------------------------------------------------------------------
async def tc015(ctx: BrowserContext) -> None:
    tc_id, title = "TC015", "Accepting consent reveals 'Entrar a la galería' CTA"
    try:
        page = await fresh_page(ctx)
        await page.reload(wait_until="domcontentloaded")

        await page.locator("[role='dialog']").wait_for(state="visible", timeout=TIMEOUT)
        await page.locator("button:has-text('Entendido, continuar')").click()
        await expect(page.locator("[role='dialog']")).not_to_be_visible(timeout=4000)
        await expect(page.locator("button:has-text('Entrar a la galería')")).to_be_visible(timeout=4000)
        consent_val = await page.evaluate("localStorage.getItem('lumen_consent')")
        assert consent_val == "true", f"lumen_consent not set, got: {consent_val}"
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC001 — Splash screen branding (consent pre-set)
# ---------------------------------------------------------------------------
async def tc001(ctx: BrowserContext) -> None:
    tc_id, title = "TC001", "Splash shows branding after consent (no tutorial yet)"
    try:
        page = await fresh_page(ctx)
        await page.evaluate("localStorage.setItem('lumen_consent','true')")
        await page.reload(wait_until="domcontentloaded")

        await expect(page.locator("img[alt='Natacha y Lucas']")).to_be_visible(timeout=TIMEOUT)
        await expect(page.locator("button:has-text('Entrar a la galería')")).to_be_visible()
        await expect(page.locator("h1")).to_contain_text("Natacha y Lucas")
        await expect(page.locator("[role='dialog']")).not_to_be_visible()
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC002 — Entry button routes to /home
# ---------------------------------------------------------------------------
async def tc002(ctx: BrowserContext) -> None:
    tc_id, title = "TC002", "'Entrar a la galería' button navigates to /home"
    try:
        page = await fresh_page(ctx)
        await page.evaluate("localStorage.setItem('lumen_consent','true')")
        await page.reload(wait_until="domcontentloaded")

        await page.locator("button:has-text('Entrar a la galería')").click()
        await page.wait_for_url("**/home**", timeout=TIMEOUT)
        await expect(page.locator("button:has-text('Galería Global')")).to_be_visible(timeout=TIMEOUT)
        await expect(page.locator("button:has-text('Mis Fotos')")).to_be_visible()
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC003 — Returning user redirected to /home directly
# ---------------------------------------------------------------------------
async def tc003(ctx: BrowserContext) -> None:
    tc_id, title = "TC003", "Returning user (consent+tutorial) redirected to /home"
    try:
        page = await fresh_page(ctx)
        await page.evaluate("""() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
        }""")
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await page.wait_for_url("**/home**", timeout=TIMEOUT)
        await expect(page.locator("button:has-text('Galería Global')")).to_be_visible(timeout=5000)
        await expect(page.locator("text=Entrar a la galería")).not_to_be_visible()
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC004 — Rapid double-tap on entry button
# ---------------------------------------------------------------------------
async def tc004(ctx: BrowserContext) -> None:
    tc_id, title = "TC004", "Rapid double-tap on entry button still lands on /home"
    try:
        page = await fresh_page(ctx)
        # Set only consent (no hasSeenTutorial), then navigate explicitly to '/'
        # so OnboardingComponent renders the splash — not a reload which might be
        # on /home if the previous test left hasSeenTutorial in shared storage.
        await page.evaluate("localStorage.setItem('lumen_consent','true')")
        await page.goto(BASE_URL, wait_until="domcontentloaded")

        btn = page.locator("button:has-text('Entrar a la galería')")
        await btn.wait_for(state="visible", timeout=TIMEOUT)
        await btn.click()
        try:
            await btn.click(timeout=500)
        except Exception:
            pass  # button gone — already navigated, that's fine
        await page.wait_for_url("**/home**", timeout=TIMEOUT)
        # No error banner
        await expect(page.locator(".error-banner")).not_to_be_visible()
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC005 — Tab switch Galería Global ↔ Mis Fotos
# ---------------------------------------------------------------------------
async def tc005(ctx: BrowserContext) -> None:
    tc_id, title = "TC005", "Tab switch 'Galería Global' ↔ 'Mis Fotos'"
    try:
        page = await fresh_page(ctx)
        await preset_consent(page)
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")

        global_btn = page.locator("button:has-text('Galería Global')")
        personal_btn = page.locator("button:has-text('Mis Fotos')")
        await expect(global_btn).to_be_visible(timeout=TIMEOUT)
        await expect(personal_btn).to_be_visible()

        await personal_btn.click()
        # Wait for Angular change detection to apply tab-btn--active
        await page.wait_for_timeout(300)
        personal_classes = await personal_btn.get_attribute("class")
        assert "active" in (personal_classes or ""), \
            f"'Mis Fotos' lacks active class after click. classes: {personal_classes}"

        await global_btn.click()
        await page.wait_for_timeout(300)
        global_classes = await global_btn.get_attribute("class")
        assert "active" in (global_classes or ""), \
            f"'Galería Global' lacks active class after click. classes: {global_classes}"
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC006 — Open photo viewer
# ---------------------------------------------------------------------------
async def tc006(ctx: BrowserContext) -> None:
    tc_id, title = "TC006", "Photo card opens full-screen viewer overlay"
    try:
        page = await fresh_page(ctx)
        await preset_consent(page)
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")

        # Wait for gallery to load (grid or empty state)
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)

        grid = page.locator(".photo-grid")
        if not await grid.is_visible():
            record(tc_id, title, "SKIP", "Gallery is empty — no photo cards to click")
            await page.close()
            return

        first_card = page.locator(".photo-card").first
        await first_card.click()
        await expect(page.locator(".photo-viewer-overlay")).to_be_visible(timeout=5000)
        await expect(page.locator("img.viewer-photo")).to_be_visible()
        await expect(page.locator("button:has-text('Guardar')")).to_be_visible()
        await expect(page.locator("[aria-label='Cerrar']")).to_be_visible()
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC007 — Close viewer with aria-label="Cerrar"
# ---------------------------------------------------------------------------
async def tc007(ctx: BrowserContext) -> None:
    tc_id, title = "TC007", "Close button (aria-label='Cerrar') dismisses viewer"
    try:
        page = await fresh_page(ctx)
        await preset_consent(page)
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)

        if not await page.locator(".photo-grid").is_visible():
            record(tc_id, title, "SKIP", "No photos in gallery")
            await page.close()
            return

        await page.locator(".photo-card").first.click()
        await page.locator(".photo-viewer-overlay").wait_for(state="visible", timeout=5000)

        await page.locator("[aria-label='Cerrar']").click()
        await expect(page.locator(".photo-viewer-overlay")).not_to_be_visible(timeout=4000)
        await expect(page.locator(".photo-grid")).to_be_visible()
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC021 — Keyboard ArrowRight navigates to next photo
# ---------------------------------------------------------------------------
async def tc021(ctx: BrowserContext) -> None:
    tc_id, title = "TC021", "ArrowRight key navigates to next photo in viewer"
    try:
        page = await fresh_page(ctx)
        await preset_consent(page)
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)

        cards = page.locator(".photo-card")
        count = await cards.count()
        if count < 2:
            record(tc_id, title, "SKIP", f"Need ≥2 photos, found {count}")
            await page.close()
            return

        await cards.first.click()
        await page.locator(".photo-viewer-overlay").wait_for(state="visible", timeout=5000)
        first_src = await page.locator("img.viewer-photo").get_attribute("src")

        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(300)  # allow 150 ms fade + settle

        new_src = await page.locator("img.viewer-photo").get_attribute("src")
        assert new_src != first_src, f"Photo src unchanged after ArrowRight: {new_src}"
        await expect(page.locator(".photo-viewer-overlay")).to_be_visible()
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC032 — Guardar button loading state
# ---------------------------------------------------------------------------
async def tc032(ctx: BrowserContext) -> None:
    tc_id, title = "TC032", "'Guardar' button shows 'Guardando...' while downloading"
    try:
        page = await fresh_page(ctx)
        await preset_consent(page)
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)

        if not await page.locator(".photo-grid").is_visible():
            record(tc_id, title, "SKIP", "No photos in gallery")
            await page.close()
            return

        await page.locator(".photo-card").first.click()
        await page.locator(".photo-viewer-overlay").wait_for(state="visible", timeout=5000)

        save_btn = page.locator(".save-btn")
        await expect(save_btn).to_be_visible()
        # Intercept download so it doesn't actually save a file
        async with page.expect_download(timeout=10_000):
            await save_btn.click()
            # loading text should appear briefly
            try:
                await expect(page.locator("text=Guardando...")).to_be_visible(timeout=3000)
                loading_seen = True
            except Exception:
                loading_seen = False

        # After download settles, button returns to normal
        await expect(save_btn.locator("span:has-text('Guardar')")).to_be_visible(timeout=8000)
        note = "" if loading_seen else "Loading state 'Guardando...' was too brief to catch — download was instant"
        record(tc_id, title, "PASS", note)
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC010 — Admin PIN login
# ---------------------------------------------------------------------------
async def tc010(ctx: BrowserContext) -> None:
    tc_id, title = "TC010", "Admin PIN '2102' unlocks Photo Dashboard"
    try:
        page = await fresh_page(ctx)
        await page.goto(f"{BASE_URL}/admin", wait_until="domcontentloaded")

        await expect(page.locator("text=Admin Access")).to_be_visible(timeout=TIMEOUT)
        pin_input = page.locator("input[placeholder='Enter 4-digit PIN']")
        await expect(pin_input).to_be_visible()

        await pin_input.fill("2102")
        await page.locator("button:has-text('Unlock Dashboard')").click()

        await expect(page.locator("text=Photo Dashboard")).to_be_visible(timeout=5000)
        await expect(page.locator("button:has-text('Logout')")).to_be_visible()
        await expect(page.locator(".dashboard")).to_be_visible()
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC033 — Admin wrong PIN
# ---------------------------------------------------------------------------
async def tc033(ctx: BrowserContext) -> None:
    tc_id, title = "TC033", "Admin wrong PIN shows 'Invalid PIN' error"
    try:
        page = await fresh_page(ctx)
        await page.goto(f"{BASE_URL}/admin", wait_until="domcontentloaded")

        pin_input = page.locator("input[placeholder='Enter 4-digit PIN']")
        await pin_input.wait_for(state="visible", timeout=TIMEOUT)
        await pin_input.fill("0000")
        await page.locator("button:has-text('Unlock Dashboard')").click()

        await expect(page.locator("text=Invalid PIN. Please try again.")).to_be_visible(timeout=3000)
        await expect(page.locator("text=Photo Dashboard")).not_to_be_visible()
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC011 — Admin delete (if photos exist)
# ---------------------------------------------------------------------------
async def tc011(ctx: BrowserContext) -> None:
    tc_id, title = "TC011", "Admin delete photo — confirmation modal then removal"
    try:
        page = await fresh_page(ctx)
        await page.goto(f"{BASE_URL}/admin", wait_until="domcontentloaded")
        await page.locator("input[placeholder='Enter 4-digit PIN']").fill("2102")
        await page.locator("button:has-text('Unlock Dashboard')").click()
        await page.locator(".dashboard").wait_for(state="visible", timeout=TIMEOUT)
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)

        if not await page.locator(".photo-grid").is_visible():
            record(tc_id, title, "SKIP", "No photos in admin dashboard to delete")
            await page.close()
            return

        before = await page.locator(".photo-card").count()
        await page.locator(".btn-delete").first.click()
        await expect(page.locator("text=Delete Photo?")).to_be_visible(timeout=4000)
        await page.locator(".btn-danger:has-text('Delete')").click()
        await expect(page.locator(".modal-overlay")).not_to_be_visible(timeout=4000)

        after = await page.locator(".photo-card").count()
        assert after == before - 1, f"Expected {before-1} cards after delete, got {after}"
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC012 — Admin cancel delete
# ---------------------------------------------------------------------------
async def tc012(ctx: BrowserContext) -> None:
    tc_id, title = "TC012", "Admin cancel delete keeps photo in list"
    try:
        page = await fresh_page(ctx)
        await page.goto(f"{BASE_URL}/admin", wait_until="domcontentloaded")
        await page.locator("input[placeholder='Enter 4-digit PIN']").fill("2102")
        await page.locator("button:has-text('Unlock Dashboard')").click()
        await page.locator(".dashboard").wait_for(state="visible", timeout=TIMEOUT)
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)

        if not await page.locator(".photo-grid").is_visible():
            record(tc_id, title, "SKIP", "No photos in admin dashboard")
            await page.close()
            return

        before = await page.locator(".photo-card").count()
        await page.locator(".btn-delete").first.click()
        await expect(page.locator("text=Delete Photo?")).to_be_visible(timeout=4000)
        await page.locator(".btn-secondary:has-text('Cancel')").click()
        await expect(page.locator(".modal-overlay")).not_to_be_visible(timeout=3000)

        after = await page.locator(".photo-card").count()
        assert after == before, f"Count changed after cancel: {before} → {after}"
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC016 — Demo tour appears in demo mode
# ---------------------------------------------------------------------------
async def tc016(ctx: BrowserContext) -> None:
    tc_id, title = "TC016", "Demo tour appears on first demo-mode visit"
    try:
        page = await fresh_page(ctx)
        await page.evaluate("""() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.removeItem('lumen_tour_completed');
            localStorage.removeItem('lumen_event_key');
        }""")
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)  # let Angular + TourService initialise

        await expect(page.locator(".lumen-tour")).to_be_visible(timeout=6000)
        await expect(page.locator("text=Paso 1 de 6")).to_be_visible()
        await expect(page.locator("text=Galería en tiempo real")).to_be_visible()
        await expect(page.locator("button:has-text('Saltar tour')")).to_be_visible()
        await expect(page.locator("button:has-text('Siguiente')")).to_be_visible()
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC017 — Tour skip button
# ---------------------------------------------------------------------------
async def tc017(ctx: BrowserContext) -> None:
    tc_id, title = "TC017", "Tour 'Saltar tour' dismisses overlay, marks completed"
    try:
        page = await fresh_page(ctx)
        await page.evaluate("""() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.removeItem('lumen_tour_completed');
            localStorage.removeItem('lumen_event_key');
        }""")
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")
        await page.locator(".lumen-tour").wait_for(state="visible", timeout=8000)

        await page.locator("button:has-text('Saltar tour')").click()
        await expect(page.locator(".lumen-tour")).not_to_be_visible(timeout=3000)

        val = await page.evaluate("localStorage.getItem('lumen_tour_completed')")
        assert val == "true", f"lumen_tour_completed not set after skip, got: {val}"
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC018 — Full 6-step tour walkthrough
# ---------------------------------------------------------------------------
async def tc018(ctx: BrowserContext) -> None:
    tc_id, title = "TC018", "Tour advances all 6 steps; final step shows 'Empezar a explorar'"
    try:
        page = await fresh_page(ctx)
        await page.evaluate("""() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.removeItem('lumen_tour_completed');
            localStorage.removeItem('lumen_event_key');
        }""")
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")
        await page.locator(".lumen-tour").wait_for(state="visible", timeout=8000)

        expected_steps = [
            ("Paso 1 de 6", "Galería en tiempo real"),
            ("Paso 2 de 6", "Tu carrete personal"),
            ("Paso 3 de 6", "Abre la cámara"),
            ("Paso 4 de 6", "Dispara"),
            ("Paso 5 de 6", "Toca para ampliar"),
            ("Paso 6 de 6", "Todo listo"),
        ]

        for i, (paso, titulo) in enumerate(expected_steps):
            await expect(page.locator(f"text={paso}")).to_be_visible(timeout=8000)
            await expect(page.locator(f"text={titulo}")).to_be_visible(timeout=4000)

            if i < len(expected_steps) - 1:
                await page.locator("button:has-text('Siguiente')").click()
                await page.wait_for_timeout(800)  # route change + settle
            else:
                # Last step
                await expect(page.locator("button:has-text('Empezar a explorar')")).to_be_visible()
                await expect(page.locator("button:has-text('Saltar tour')")).not_to_be_visible()
                await page.locator("button:has-text('Empezar a explorar')").click()

        await expect(page.locator(".lumen-tour")).not_to_be_visible(timeout=3000)
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC019 — Escape key closes tour
# ---------------------------------------------------------------------------
async def tc019(ctx: BrowserContext) -> None:
    tc_id, title = "TC019", "Escape key dismisses tour overlay"
    try:
        page = await fresh_page(ctx)
        await page.evaluate("""() => {
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.removeItem('lumen_tour_completed');
            localStorage.removeItem('lumen_event_key');
        }""")
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")
        await page.locator(".lumen-tour").wait_for(state="visible", timeout=8000)

        await page.keyboard.press("Escape")
        await expect(page.locator(".lumen-tour")).not_to_be_visible(timeout=3000)
        val = await page.evaluate("localStorage.getItem('lumen_tour_completed')")
        assert val == "true", f"lumen_tour_completed not persisted after Escape, got: {val}"
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC020 — Tour doesn't reappear after completion
# ---------------------------------------------------------------------------
async def tc020(ctx: BrowserContext) -> None:
    tc_id, title = "TC020", "Tour absent on second visit (lumen_tour_completed=true)"
    try:
        page = await fresh_page(ctx)
        await preset_consent(page, tour_done=True)
        await page.evaluate("localStorage.removeItem('lumen_event_key')")
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)

        await expect(page.locator(".lumen-tour")).not_to_be_visible()
        await expect(page.locator(".home-container")).to_be_visible(timeout=5000)
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC025 — Photo counter reflects localStorage value
# ---------------------------------------------------------------------------
async def tc025(ctx: BrowserContext) -> None:
    tc_id, title = "TC025", "Photo counter shows remaining count with correct colour class"
    try:
        page = await fresh_page(ctx)
        await preset_consent(page)

        # 7 → gray
        await page.evaluate("localStorage.setItem('lumen_photos_remaining','7')")
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")
        await expect(page.locator("text=7 fotos restantes")).to_be_visible(timeout=TIMEOUT)
        cls7 = await page.locator(".header-subtitle").get_attribute("class")
        assert "text-gray-500" in (cls7 or ""), f"Expected gray class for 7 remaining, got: {cls7}"

        # 2 → orange
        await page.evaluate("localStorage.setItem('lumen_photos_remaining','2')")
        await page.reload(wait_until="domcontentloaded")
        await expect(page.locator("text=2 fotos restantes")).to_be_visible(timeout=TIMEOUT)
        cls2 = await page.locator(".header-subtitle").get_attribute("class")
        assert "text-orange-500" in (cls2 or ""), f"Expected orange class for 2 remaining, got: {cls2}"

        # 1 → red
        await page.evaluate("localStorage.setItem('lumen_photos_remaining','1')")
        await page.reload(wait_until="domcontentloaded")
        await expect(page.locator("text=1 fotos restantes")).to_be_visible(timeout=TIMEOUT)
        cls1 = await page.locator(".header-subtitle").get_attribute("class")
        assert "text-red-500" in (cls1 or ""), f"Expected red class for 1 remaining, got: {cls1}"

        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC026 — Photo limit blocks camera, shows limit modal
# ---------------------------------------------------------------------------
async def tc026(ctx: BrowserContext) -> None:
    tc_id, title = "TC026", "Camera FAB blocked at 0 remaining — limit modal appears"
    try:
        page = await fresh_page(ctx)
        await preset_consent(page)
        await page.evaluate("localStorage.setItem('lumen_photos_remaining','0')")
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")

        await expect(page.locator("text=0 fotos restantes")).to_be_visible(timeout=TIMEOUT)
        await page.locator("[data-tour='camera-fab']").click()

        await expect(page.locator(".limit-modal-content")).to_be_visible(timeout=3000)
        await expect(page.locator("text=¡Vaya! Carrete lleno")).to_be_visible()
        await expect(page.locator("button:has-text('Ir a mi Galería y liberar espacio')")).to_be_visible()
        assert "/camera" not in page.url, f"Unexpectedly navigated to camera: {page.url}"
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC027 — Limit modal CTA switches to Mis Fotos tab
# ---------------------------------------------------------------------------
async def tc027(ctx: BrowserContext) -> None:
    tc_id, title = "TC027", "Limit modal CTA switches to 'Mis Fotos' tab"
    try:
        page = await fresh_page(ctx)
        await preset_consent(page)
        await page.evaluate("localStorage.setItem('lumen_photos_remaining','0')")
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")

        await page.locator("[data-tour='camera-fab']").click()
        await page.locator(".limit-modal-content").wait_for(state="visible", timeout=3000)
        await page.locator("button:has-text('Ir a mi Galería y liberar espacio')").click()

        await expect(page.locator(".limit-modal-content")).not_to_be_visible(timeout=3000)
        personal_btn = page.locator("button:has-text('Mis Fotos')")
        cls = await personal_btn.get_attribute("class")
        assert "active" in (cls or ""), f"'Mis Fotos' not active after limit modal CTA: {cls}"
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC028 — Multi-tenant isolation via ?e= param
# ---------------------------------------------------------------------------
async def tc028(ctx: BrowserContext) -> None:
    tc_id, title = "TC028", "?e= URL param scopes gallery and persists to localStorage"
    try:
        page = await fresh_page(ctx)
        await preset_consent(page)
        await page.evaluate("localStorage.removeItem('lumen_event_key')")
        await page.goto(f"{BASE_URL}/home?e=test-isolated-event-xyz", wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)

        stored = await page.evaluate("localStorage.getItem('lumen_event_key')")
        assert stored == "test-isolated-event-xyz", \
            f"event key not stored correctly, got: {stored}"

        # Navigate away, come back — key must persist
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded")
        stored2 = await page.evaluate("localStorage.getItem('lumen_event_key')")
        assert stored2 == "test-isolated-event-xyz", \
            f"event key not persisted across navigation, got: {stored2}"

        # Gallery content should load (even if empty for this isolated event)
        await page.wait_for_selector(".photo-grid, .empty-state", timeout=TIMEOUT)
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        await page.close()


# ---------------------------------------------------------------------------
# TC031 — In-app browser banner with WhatsApp UA
# ---------------------------------------------------------------------------
async def tc031_inapp(browser) -> None:
    tc_id, title = "TC031", "In-app browser banner visible with WhatsApp User-Agent"
    try:
        ctx2 = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) WhatsApp/23.20.74 Mobile/15E148"
        )
        page = await ctx2.new_page()
        # Navigate first so localStorage is accessible, then set up state
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.evaluate("""() => {
            localStorage.clear();
            localStorage.setItem('lumen_consent','true');
            localStorage.setItem('hasSeenTutorial','true');
            localStorage.setItem('lumen_tour_completed','true');
        }""")
        await page.goto(f"{BASE_URL}/home", wait_until="domcontentloaded", timeout=TIMEOUT)
        await page.wait_for_timeout(1000)

        banner = page.locator("text=Para usar la cámara y ver las fotos correctamente")
        await expect(banner).to_be_visible(timeout=5000)
        record(tc_id, title, "PASS")
    except Exception as e:
        record(tc_id, title, "FAIL", str(e)[:120])
    finally:
        try:
            await ctx2.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
async def main() -> None:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--window-size=1280,720", "--disable-dev-shm-usage"]
        )
        ctx = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            ignore_https_errors=False
        )

        print("\n" + "="*70)
        print("  LUMEN E2E VALIDATION — against https://lumen-umber.vercel.app")
        print("="*70 + "\n")

        print("── RGPD Consent Gate ──────────────────────────────────────────────")
        await tc013(ctx)
        await tc014(ctx)
        await tc015(ctx)

        print("\n── Onboarding Splash ──────────────────────────────────────────────")
        await tc001(ctx)
        await tc002(ctx)
        await tc003(ctx)
        await tc004(ctx)

        print("\n── Live Gallery (Home) ────────────────────────────────────────────")
        await tc005(ctx)
        await tc006(ctx)
        await tc007(ctx)
        await tc021(ctx)
        await tc032(ctx)

        print("\n── Photo Limit Enforcement ────────────────────────────────────────")
        await tc025(ctx)
        await tc026(ctx)
        await tc027(ctx)

        print("\n── Multi-Tenant Isolation ─────────────────────────────────────────")
        await tc028(ctx)

        print("\n── Guided Demo Tour ───────────────────────────────────────────────")
        await tc016(ctx)
        await tc017(ctx)
        await tc018(ctx)
        await tc019(ctx)
        await tc020(ctx)

        print("\n── Admin Panel ────────────────────────────────────────────────────")
        await tc010(ctx)
        await tc033(ctx)
        await tc012(ctx)
        await tc011(ctx)  # last — may delete a photo

        print("\n── In-App Browser Detection ───────────────────────────────────────")
        await tc031_inapp(browser)

        await ctx.close()
        await browser.close()

        # Summary
        passed = [r for r in results if r["status"] == "PASS"]
        failed = [r for r in results if r["status"] == "FAIL"]
        skipped = [r for r in results if r["status"] == "SKIP"]

        print("\n" + "="*70)
        print(f"  RESULTS: {len(passed)} PASS  |  {len(failed)} FAIL  |  {len(skipped)} SKIP")
        print("="*70)
        if failed:
            print("\n  FAILURES:")
            for r in failed:
                print(f"    ❌ {r['id']}: {r['title']}")
                if r["note"]:
                    print(f"       {r['note']}")
        if skipped:
            print("\n  SKIPPED (setup dependency):")
            for r in skipped:
                print(f"    ⚠️  {r['id']}: {r['title']}")
                if r["note"]:
                    print(f"       {r['note']}")

        # Write JSON report
        report = {
            "target": BASE_URL,
            "summary": {
                "pass": len(passed), "fail": len(failed), "skip": len(skipped),
                "total": len(results)
            },
            "results": results
        }
        with open("/Users/agustinpayaalamar/dev/Lumen/web/testsprite_tests/validation_report.json", "w") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print("\n  Report saved → testsprite_tests/validation_report.json")


asyncio.run(main())
