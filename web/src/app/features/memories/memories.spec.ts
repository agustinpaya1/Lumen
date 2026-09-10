import { TestBed, ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GalleryPhoto } from '@core/models/photo';
import { MemoriesComponent } from './memories';

const photo = (id: number): GalleryPhoto => ({
  id,
  url: `${id}.jpg`,
  publicUrl: `https://example.test/${id}.jpg`,
  dedication: null,
  device_id: 'test',
  event_key: 'test',
  created_at: `2026-09-12T12:00:0${id}Z`,
});

describe('MemoriesComponent playback', () => {
  const originalShowModal = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  let fixture: ComponentFixture<MemoriesComponent>;
  let component: MemoriesComponent;

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    // jsdom does not implement the browser's dialog top layer.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });
    TestBed.configureTestingModule({ imports: [MemoriesComponent] });
    fixture = TestBed.createComponent(MemoriesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('photos', [photo(3), photo(2), photo(1)]);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    if (originalShowModal)
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function render(): void {
    fixture.detectChanges();
    TestBed.tick();
  }

  it('waits for an image to load before starting its seven-second viewing time', () => {
    vi.advanceTimersByTime(20000);
    expect(component.current()?.id).toBe(1);
    component.imageLoaded(1);
    render();
    vi.advanceTimersByTime(6999);
    expect(component.current()?.id).toBe(1);
    vi.advanceTimersByTime(1);
    expect(component.current()?.id).toBe(2);
    render();
    vi.advanceTimersByTime(14000);
    expect(component.current()?.id).toBe(2);
  });

  it('stops advancing while paused or while the page is hidden', () => {
    component.imageLoaded(1);
    component.playing.set(false);
    render();
    vi.advanceTimersByTime(14000);
    expect(component.current()?.id).toBe(1);
    component.playing.set(true);
    component.pageVisible.set(false);
    render();
    vi.advanceTimersByTime(14000);
    expect(component.current()?.id).toBe(1);
    component.pageVisible.set(true);
    render();
    vi.advanceTimersByTime(7000);
    expect(component.current()?.id).toBe(2);
  });

  it('preserves the displayed frame on live inserts and handles deletion of that frame', () => {
    component.advance(1);
    component.imageLoaded(2);
    fixture.componentRef.setInput('photos', [photo(4), photo(3), photo(2), photo(1)]);
    render();
    expect(component.current()?.id).toBe(2);
    fixture.componentRef.setInput('photos', [photo(4), photo(3), photo(1)]);
    render();
    expect(component.current()?.id).toBe(1);
    expect(component.ready()).toBe(false);
    fixture.componentRef.setInput('photos', []);
    render();
    expect(component.current()).toBeNull();
    component.advance(1);
    expect(component.position()).toBe(0);
  });

  it('pauses on a broken image and ignores late load events from older frames', () => {
    component.advance(1);
    component.imageLoaded(1);
    expect(component.ready()).toBe(false);
    component.imageFailed(2);
    expect(component.failed()).toBe(true);
    expect(component.playing()).toBe(false);
    component.retry();
    expect(component.failed()).toBe(false);
    expect(component.retryVersion()).toBe(1);
  });

  it('cancels the playback timer on destruction', () => {
    component.imageLoaded(1);
    render();
    fixture.destroy();
    vi.advanceTimersByTime(14000);
    expect(component.current()?.id).toBe(1);
  });

  it('uses a presentation element, not the dialog, for native fullscreen', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(component.presentation().nativeElement, 'requestFullscreen', {
      value: request,
    });
    await component.fullscreen();
    expect(request).toHaveBeenCalledOnce();
    expect(component.cinemaMode()).toBe(true);
    expect(component.fullscreenMessage()).toBe('');
  });

  it('retains TV layout and explains unsupported fullscreen', async () => {
    Object.defineProperty(component.presentation().nativeElement, 'requestFullscreen', {
      value: undefined,
    });
    await component.fullscreen();
    expect(component.cinemaMode()).toBe(true);
    expect(component.fullscreenMessage()).toContain('completa');
  });

  it('allows restoring hidden controls from the keyboard', () => {
    component.controlsHidden.set(true);
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(component.controlsHidden()).toBe(false);
  });

  it('starts paused when the visitor prefers reduced motion', () => {
    fixture.destroy();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    fixture = TestBed.createComponent(MemoriesComponent);
    fixture.componentRef.setInput('photos', [photo(1), photo(2)]);
    fixture.detectChanges();
    expect(fixture.componentInstance.playing()).toBe(false);
  });
});
