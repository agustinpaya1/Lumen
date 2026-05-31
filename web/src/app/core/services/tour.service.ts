import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LUMEN_TOUR_KEY } from '@core/constants';

/** Side of the target the tooltip prefers; it is clamped to stay on-screen. */
export type TourPlacement = 'top' | 'bottom' | 'left' | 'right';

/** A single step in the guided tour. */
export interface TourStep {
  /** CSS selector of the element to spotlight. Omit for a centered, fully-dimmed step. */
  target?: string;
  title: string;
  body: string;
  /** Preferred side of the target for the tooltip (default 'bottom'). */
  placement?: TourPlacement;
  /** Route to navigate to before showing this step (e.g. '/camera'). */
  route?: string;
  /** Overrides the default "Siguiente" label on the primary button. */
  nextLabel?: string;
}

/**
 * The demo walkthrough shown to first-time visitors in demo mode. Copy is in
 * Spanish; steps 4–5 deliberately hop to /camera and back to /home, which is
 * why the overlay lives on <body> rather than inside any one component.
 */
const DEMO_TOUR_STEPS: readonly TourStep[] = [
  {
    target: '[data-tour="gallery"]',
    route: '/home',
    placement: 'bottom',
    title: 'Galería en tiempo real',
    body: 'Todas las fotos del evento aparecen aquí al instante, sin recargar la página.',
  },
  {
    target: '[data-tour="tabs"]',
    route: '/home',
    placement: 'bottom',
    title: 'Tu carrete personal',
    body: 'Cambia entre la galería global y tus propias fotos.',
  },
  {
    target: '[data-tour="camera-fab"]',
    route: '/home',
    placement: 'top',
    title: 'Abre la cámara',
    body: 'Haz tu propia foto directamente desde el navegador, sin instalar nada.',
  },
  {
    target: '[data-tour="shutter"]',
    route: '/camera',
    placement: 'top',
    title: 'Dispara',
    body: 'Pulsa para capturar. Puedes añadir una dedicatoria antes de revelar.',
  },
  {
    target: '[data-tour="photo-card"]',
    route: '/home',
    placement: 'bottom',
    title: 'Toca para ampliar',
    body: 'Pulsa cualquier foto para verla a pantalla completa, descargarla o eliminar las tuyas.',
  },
  {
    route: '/home',
    title: 'Todo listo',
    body: 'Esto es Lumen. Escanea el QR de tu evento y empieza a capturar recuerdos.',
    nextLabel: 'Empezar a explorar',
  },
];

/** How long to wait for a (possibly cross-route) target before centering the bubble. */
const TARGET_WAIT_MS = 5000;
/** Gap between the target and the tooltip, and the viewport safe-area margin. */
const TOOLTIP_GAP = 14;
const VIEWPORT_MARGIN = 8;
/** Transparent ring of dimming kept around the highlighted element. */
const SPOTLIGHT_PADDING = 6;

/**
 * Standalone guided-tour engine — no external library. Renders a spotlight
 * overlay (a transparent cut-out with a large box-shadow dimming everything
 * else) plus an absolutely-positioned tooltip, driving the {@link DEMO_TOUR_STEPS}
 * sequence. The whole overlay is built on document.body so it persists across
 * the route changes some steps trigger. Completion is remembered per device in
 * localStorage so the tour runs only once.
 */
@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  private readonly steps = DEMO_TOUR_STEPS;

  private active = false;
  private currentIndex = 0;
  /** Bumped on every step change / teardown to invalidate in-flight async work. */
  private runToken = 0;
  private prevBodyOverflow = '';
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  // Overlay DOM — created lazily in start(), removed in teardown().
  private root: HTMLElement | null = null;
  private spotlight: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;
  private progressEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private bodyEl: HTMLElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;

  private readonly onViewportChange = (): void => this.reposition();
  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.end(true);
  };

  /** True once the visitor has finished or skipped the tour on this device. */
  hasCompleted(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(LUMEN_TOUR_KEY) === 'true';
  }

  /** Whether the tour is currently on screen. */
  get isActive(): boolean {
    return this.active;
  }

  /**
   * Starts the tour only on a genuine first demo-mode visit: a no-op when not
   * in demo mode, already running, or already completed on this device.
   * @param isDemoMode Whether the active event resolved to the demo event.
   */
  maybeStart(isDemoMode: boolean): void {
    if (!isDemoMode || this.active || this.hasCompleted()) return;
    this.start();
  }

  /** Starts (or restarts) the tour from the first step. */
  start(): void {
    if (this.active || typeof window === 'undefined') return;
    this.active = true;
    this.currentIndex = 0;

    this.buildOverlay();
    this.lockScroll();
    this.document.addEventListener('keydown', this.onKeydown);
    window.addEventListener('resize', this.onViewportChange);
    window.addEventListener('orientationchange', this.onViewportChange);

    void this.showStep(0);
    // Enable position transitions once the first step is placed. setTimeout (not
    // rAF) so it still fires when the tab is backgrounded and rAF is paused.
    setTimeout(() => this.root?.classList.remove('lumen-tour--instant'), 0);
  }

  // OVERLAY CONSTRUCTION

  private buildOverlay(): void {
    const doc = this.document;
    const root = doc.createElement('div');
    // --instant suppresses position transitions until the first step is placed.
    root.className = 'lumen-tour lumen-tour--instant';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');

    const backdrop = this.make('div', 'lumen-tour__backdrop');
    const spotlight = this.make('div', 'lumen-tour__spotlight');

    const tooltip = this.make('div', 'lumen-tour__tooltip');
    const progressEl = this.make('p', 'lumen-tour__progress');
    const titleEl = this.make('h3', 'lumen-tour__title');
    const bodyEl = this.make('p', 'lumen-tour__body');

    const actions = this.make('div', 'lumen-tour__actions');
    const skipBtn = this.make('button', 'lumen-tour__btn lumen-tour__btn--skip') as HTMLButtonElement;
    skipBtn.type = 'button';
    skipBtn.textContent = 'Saltar tour';
    skipBtn.addEventListener('click', () => this.end(true));
    const nextBtn = this.make('button', 'lumen-tour__btn lumen-tour__btn--next') as HTMLButtonElement;
    nextBtn.type = 'button';
    nextBtn.addEventListener('click', () => this.next());

    actions.append(skipBtn, nextBtn);
    tooltip.append(progressEl, titleEl, bodyEl, actions);
    root.append(backdrop, spotlight, tooltip);
    doc.body.appendChild(root);

    this.root = root;
    this.spotlight = spotlight;
    this.tooltip = tooltip;
    this.progressEl = progressEl;
    this.titleEl = titleEl;
    this.bodyEl = bodyEl;
    this.skipBtn = skipBtn;
    this.nextBtn = nextBtn;
  }

  private make(tag: string, className: string): HTMLElement {
    const el = this.document.createElement(tag);
    el.className = className;
    return el;
  }

  // STEP FLOW

  /**
   * Renders the given step: navigates if needed, then spotlights its target (or
   * centers the bubble if the target is absent or never appears in time).
   */
  private async showStep(index: number): Promise<void> {
    const token = ++this.runToken;
    this.currentIndex = index;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }

    const step = this.steps[index];
    this.renderContent(step, index);

    const currentPath = this.router.url.split('?')[0];
    if (step.route && step.route !== currentPath) {
      this.applyCentered(); // keep the bubble visible while the next view loads
      await this.router.navigate([step.route]);
      if (token !== this.runToken) return;
    }

    if (!step.target) {
      this.applyCentered();
      return;
    }

    let target = this.document.querySelector<HTMLElement>(step.target);
    if (!target) {
      this.applyCentered();
      target = await this.waitForElement(step.target, TARGET_WAIT_MS);
      if (token !== this.runToken) return;
    }

    if (target) {
      this.applyTargetPosition(target, step.placement ?? 'bottom');
      this.scheduleSettle(token);
    } else {
      this.applyCentered();
    }
  }

  /**
   * Re-measures a moment after a step is shown: late layout (images decoding or
   * a change-detection flush) can resize the target after the first measure.
   */
  private scheduleSettle(token: number): void {
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      if (this.active && token === this.runToken) this.reposition();
    }, 350);
  }

  private renderContent(step: TourStep, index: number): void {
    if (!this.progressEl || !this.titleEl || !this.bodyEl || !this.nextBtn || !this.skipBtn) return;
    this.progressEl.textContent = `Paso ${index + 1} de ${this.steps.length}`;
    this.titleEl.textContent = step.title;
    this.bodyEl.textContent = step.body;
    this.nextBtn.textContent = step.nextLabel ?? 'Siguiente';
    // The last step is itself the exit, so the "Saltar tour" escape hatch hides
    // and its CTA spans the full width.
    const isLast = index === this.steps.length - 1;
    this.skipBtn.style.display = isLast ? 'none' : '';
    this.nextBtn.classList.toggle('lumen-tour__btn--full', isLast);
  }

  private next(): void {
    if (this.currentIndex >= this.steps.length - 1) {
      this.end(true);
    } else {
      void this.showStep(this.currentIndex + 1);
    }
  }

  /**
   * Ends the tour and tears the overlay down.
   * @param markCompleted Persist completion so it never auto-runs again.
   */
  private end(markCompleted: boolean): void {
    if (!this.active) return;
    this.active = false;
    this.runToken++;
    if (markCompleted) this.persistCompleted();
    this.teardown();
  }

  // POSITIONING

  /** Spotlights `target` and parks the tooltip on its preferred side, clamped on-screen. */
  private applyTargetPosition(target: HTMLElement, placement: TourPlacement): void {
    if (!this.root || !this.spotlight || !this.tooltip) return;
    this.root.classList.remove('lumen-tour--no-target');

    const rect = target.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const left = this.clamp(rect.left - SPOTLIGHT_PADDING, 4, vw - 4);
    const top = this.clamp(rect.top - SPOTLIGHT_PADDING, 4, vh - 4);
    const right = this.clamp(rect.right + SPOTLIGHT_PADDING, 4, vw - 4);
    const bottom = this.clamp(rect.bottom + SPOTLIGHT_PADDING, 4, vh - 4);
    this.spotlight.style.left = `${left}px`;
    this.spotlight.style.top = `${top}px`;
    this.spotlight.style.width = `${Math.max(right - left, 0)}px`;
    this.spotlight.style.height = `${Math.max(bottom - top, 0)}px`;

    const tipW = this.tooltip.offsetWidth;
    const tipH = this.tooltip.offsetHeight;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let tx: number;
    let ty: number;
    switch (placement) {
      case 'top':
        tx = cx - tipW / 2;
        ty = rect.top - tipH - TOOLTIP_GAP;
        break;
      case 'left':
        tx = rect.left - tipW - TOOLTIP_GAP;
        ty = cy - tipH / 2;
        break;
      case 'right':
        tx = rect.right + TOOLTIP_GAP;
        ty = cy - tipH / 2;
        break;
      case 'bottom':
      default:
        tx = cx - tipW / 2;
        ty = rect.bottom + TOOLTIP_GAP;
        break;
    }
    this.tooltip.style.left = `${this.clamp(tx, VIEWPORT_MARGIN, vw - tipW - VIEWPORT_MARGIN)}px`;
    this.tooltip.style.top = `${this.clamp(ty, VIEWPORT_MARGIN, vh - tipH - VIEWPORT_MARGIN)}px`;
  }

  /** Centers the tooltip and dims the whole screen (used for target-less / loading steps). */
  private applyCentered(): void {
    if (!this.root || !this.tooltip) return;
    this.root.classList.add('lumen-tour--no-target');
    const tipW = this.tooltip.offsetWidth;
    const tipH = this.tooltip.offsetHeight;
    this.tooltip.style.left = `${Math.max((window.innerWidth - tipW) / 2, VIEWPORT_MARGIN)}px`;
    this.tooltip.style.top = `${Math.max((window.innerHeight - tipH) / 2, VIEWPORT_MARGIN)}px`;
  }

  private reposition(): void {
    if (!this.active) return;
    const step = this.steps[this.currentIndex];
    const target = step.target ? this.document.querySelector<HTMLElement>(step.target) : null;
    if (target) {
      this.applyTargetPosition(target, step.placement ?? 'bottom');
    } else {
      this.applyCentered();
    }
  }

  // HELPERS

  /** Polls for `selector` until it exists or the timeout elapses (handles late/cross-route targets). */
  private waitForElement(selector: string, timeoutMs: number): Promise<HTMLElement | null> {
    return new Promise(resolve => {
      const start = Date.now();
      const poll = (): void => {
        const el = this.document.querySelector<HTMLElement>(selector);
        if (el) {
          resolve(el);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          resolve(null);
          return;
        }
        this.pollTimer = setTimeout(poll, 80);
      };
      poll();
    });
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  private lockScroll(): void {
    this.prevBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
  }

  private persistCompleted(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(LUMEN_TOUR_KEY, 'true');
    } catch {
      // Private-mode / storage disabled — the tour simply runs again next time.
    }
  }

  private teardown(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    this.document.removeEventListener('keydown', this.onKeydown);
    window.removeEventListener('resize', this.onViewportChange);
    window.removeEventListener('orientationchange', this.onViewportChange);
    this.document.body.style.overflow = this.prevBodyOverflow;
    this.root?.remove();
    this.root = this.spotlight = this.tooltip = null;
    this.progressEl = this.titleEl = this.bodyEl = null;
    this.skipBtn = this.nextBtn = null;
  }
}
