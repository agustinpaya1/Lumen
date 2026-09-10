import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { GalleryPhoto } from '@core/models/photo';

/** An opt-in presentation. It consumes the gallery's live data, never another subscription. */
@Component({
  selector: 'app-memories',
  templateUrl: './memories.html',
  styleUrl: './memories.scss',
})
export class MemoriesComponent implements AfterViewInit, OnDestroy {
  readonly photos = input.required<GalleryPhoto[]>();
  readonly cinema = input(false);
  readonly cinemaMode = signal(false);
  readonly controlsHidden = signal(false);
  readonly fullscreenMessage = signal('');
  readonly presentation = viewChild.required<ElementRef<HTMLElement>>('presentation');
  readonly closed = output<void>();
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly playing = signal(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  readonly activeId = signal<number | null>(null);
  readonly loadedId = signal<number | null>(null);
  readonly failedId = signal<number | null>(null);
  readonly retryVersion = signal(0);
  readonly pageVisible = signal(document.visibilityState !== 'hidden');
  // Chronological playback; identify the current frame by ID so live inserts
  // never shift the displayed photo. Deleted frames fall back to a valid one.
  readonly orderedPhotos = computed(() =>
    [...this.photos()].sort(
      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id - b.id,
    ),
  );
  readonly current = computed(
    () =>
      this.orderedPhotos().find((p) => p.id === this.activeId()) ?? this.orderedPhotos()[0] ?? null,
  );
  readonly position = computed(
    () => this.orderedPhotos().findIndex((p) => p.id === this.current()?.id) + 1,
  );
  readonly frame = computed(() => (this.current() ? [this.current()!] : []));
  readonly ready = computed(() => !!this.current() && this.loadedId() === this.current()!.id);
  readonly failed = computed(() => !!this.current() && this.failedId() === this.current()!.id);
  private previousFocus: HTMLElement | null = null;
  private previousOverflow = '';

  constructor() {
    effect((onCleanup) => {
      const current = this.current();
      if (
        !current ||
        !this.playing() ||
        !this.ready() ||
        !this.pageVisible() ||
        this.photos().length < 2
      )
        return;
      // A slow connection gets a full seven seconds AFTER the image loads.
      const timer = setTimeout(() => this.advance(1), 7000);
      onCleanup(() => clearTimeout(timer));
    });
  }

  ngAfterViewInit(): void {
    this.cinemaMode.set(this.cinema());
    this.previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.dialog().nativeElement.showModal();
  }

  ngOnDestroy(): void {
    if (document.fullscreenElement === this.presentation().nativeElement) {
      void document.exitFullscreen().catch(() => {});
    }
    document.body.style.overflow = this.previousOverflow;
    this.previousFocus?.focus({ preventScroll: true });
  }

  dismiss(): void {
    this.dialog().nativeElement.close();
  }

  async fullscreen(): Promise<void> {
    this.cinemaMode.set(true);
    this.fullscreenMessage.set('');
    const element = this.presentation().nativeElement;
    try {
      if (document.fullscreenElement === element) await document.exitFullscreen();
      else if (element.requestFullscreen) await element.requestFullscreen();
      else
        this.fullscreenMessage.set(
          'Este navegador no permite ocultar sus barras. La foto se muestra completa igualmente.',
        );
    } catch {
      this.fullscreenMessage.set(
        'No se pudo ocultar la interfaz del navegador. La foto se muestra completa igualmente.',
      );
    }
  }

  togglePlayback(): void {
    this.playing.update((value) => !value);
  }

  advance(direction: 1 | -1): void {
    const photos = this.orderedPhotos();
    if (photos.length < 2) return;
    const next = (this.position() - 1 + direction + photos.length) % photos.length;
    this.loadedId.set(null);
    this.failedId.set(null);
    this.activeId.set(photos[next].id);
  }

  imageLoaded(id: number): void {
    if (this.current()?.id === id) {
      this.loadedId.set(id);
      this.failedId.set(null);
      this.activeId.set(id);
    }
  }

  imageFailed(id: number): void {
    if (this.current()?.id === id) {
      this.failedId.set(id);
      this.playing.set(false);
    }
  }

  retry(): void {
    this.failedId.set(null);
    this.loadedId.set(null);
    this.retryVersion.update((v) => v + 1);
  }

  @HostListener('document:visibilitychange')
  visibilityChanged(): void {
    this.pageVisible.set(document.visibilityState !== 'hidden');
  }

  onKeydown(event: KeyboardEvent): void {
    this.controlsHidden.set(false);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.advance(event.key === 'ArrowLeft' ? -1 : 1);
    }
    // Space on a focused button keeps its native action.
    if (event.code === 'Space' && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      this.togglePlayback();
    }
  }
}
