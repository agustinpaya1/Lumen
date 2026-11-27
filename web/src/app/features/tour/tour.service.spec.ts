import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LUMEN_TOUR_KEY } from '@core/constants';
import { TourService } from './tour.service';

describe('Event tour', () => {
  let tour: TourService;
  const navigate = vi.fn();
  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    navigate.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { url: '/home', navigate } }] });
    tour = TestBed.inject(TourService);
  });
  afterEach(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });

  it('starts on the real event even after demo completion, and remembers skipping per event', () => {
    localStorage.setItem(LUMEN_TOUR_KEY, 'true');
    tour.maybeStart('clausura-lideres-2026', 'Clausura de Líderes');
    expect(tour.isActive).toBe(true);
    expect(document.querySelector('.lumen-tour__title')?.textContent).toContain('Clausura de Líderes');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(tour.isActive).toBe(false);
    tour.maybeStart('clausura-lideres-2026', 'Clausura de Líderes');
    expect(tour.isActive).toBe(false);
    tour.maybeStart('another-event', 'Otro evento');
    expect(tour.isActive).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not restart while already running and completes without leaving this gallery', () => {
    tour.maybeStart('clausura-lideres-2026', 'Clausura de Líderes');
    tour.maybeStart('clausura-lideres-2026', 'Clausura de Líderes');
    expect(document.querySelectorAll('.lumen-tour')).toHaveLength(1);
    for (let step = 0; step < 4; step++) document.querySelector<HTMLButtonElement>('.lumen-tour__btn--next')!.click();
    expect(tour.isActive).toBe(false);
    expect(localStorage.getItem(`${LUMEN_TOUR_KEY}:clausura-lideres-2026`)).toBe('true');
    expect(navigate).not.toHaveBeenCalled();
  });
});
