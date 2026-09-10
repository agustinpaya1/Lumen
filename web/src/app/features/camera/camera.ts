import {
  Component,
  signal,
  computed,
  viewChild,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { CommonModule } from '@angular/common';
import imageCompression from 'browser-image-compression';
import { PhotoLimitService } from '@core/services/photo-limit.service';
import { UploadQueueService } from '@core/services/upload-queue.service';
import { FeedbackService } from '@core/services/feedback.service';
import { LoggerService } from '@core/services/logger.service';
import { triggerBrowserDownload } from '@core/utils/download';
import { counterColorClass, detectDevicePlatform } from '@core/utils/capture';
import { Router } from '@angular/router';
import { EventService } from '@core/services/event.service';
import { AnalyticsService } from '@core/services/analytics.service';

// State Machine — 5 stable states (no editor)
type CameraState = 'viewfinder' | 'preview' | 'uploading' | 'success' | 'queued';

interface DedicationModel {
  dedication: string;
}

@Component({
  selector: 'app-camera',
  imports: [CommonModule, FormField],
  templateUrl: './camera.html',
  styleUrl: './camera.scss',
})
export class CameraComponent implements OnInit, OnDestroy {
  readonly event = inject(EventService);
  // Services
  readonly photoLimitService = inject(PhotoLimitService);
  readonly feedbackService = inject(FeedbackService);
  private readonly uploadQueue = inject(UploadQueueService);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);
  private readonly analytics = inject(AnalyticsService);

  // View children
  readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoRef');
  readonly cameraFileInput = viewChild<ElementRef<HTMLInputElement>>('cameraFileInput');

  // Core state signals
  readonly currentState = signal<CameraState>('viewfinder');
  readonly errorMessage = signal<string | null>(null);
  readonly uploadProgress = signal<number>(0);
  readonly isUploading = signal<boolean>(false);
  readonly retryMessage = signal<string | null>(null);
  readonly permissionHelperVisible = signal<boolean>(false);
  readonly devicePlatform = signal<'ios' | 'android' | 'unknown'>('unknown');
  /** Camera facing mode: 'environment' (back) or 'user' (front) */
  readonly facingMode = signal<'environment' | 'user'>('environment');

  /** Position of the temporary tap-to-focus indicator, as viewfinder percentages. */
  readonly focusPoint = signal<{ x: number; y: number } | null>(null);

  /** Whether the camera is currently flipping (for animation) */
  readonly isFlipping = signal<boolean>(false);

  /** Whether the photo in preview originated from a gallery upload */
  readonly isFromGallery = signal<boolean>(false);

  // Camera Controls (Grid & Flash)

  /** Whether the Rule of Thirds 3×3 grid overlay is visible */
  readonly showGrid = signal<boolean>(false);

  /** Flash mode: 'off' or 'on' (hardware torch attempt + software screen flash) */
  readonly flashMode = signal<'off' | 'on'>('off');

  /** Whether the white screen flash overlay is currently active */
  readonly isFlashing = signal<boolean>(false);

  // Photo signals

  /** Raw photo blob captured from viewfinder */
  readonly rawPhotoBlob = signal<Blob | null>(null);

  /** Object URL for displaying the raw photo in <img> */
  readonly rawPhotoUrl = computed<string | null>(() => {
    const blob = this.rawPhotoBlob();
    return blob ? URL.createObjectURL(blob) : null;
  });

  // Media stream
  private mediaStream: MediaStream | null = null;
  private lastViewfinderTap: { at: number; clientX: number; clientY: number } | null = null;
  private focusIndicatorTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly doubleTapWindowMs = 320;
  private readonly doubleTapDistancePx = 48;

  // Signal Form for dedication text
  private readonly dedicationModel = signal<DedicationModel>({ dedication: '' });
  readonly dedicationForm = form(this.dedicationModel);

  // Computed signals
  readonly isLimitReached = computed(() => this.photoLimitService.photosLeft() === 0);
  readonly canProceed = computed(() => this.photoLimitService.canTakePhoto());

  // Beforeunload handler reference
  private beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;
  private destroyed = false;

  constructor() {
    this.detectDevicePlatform();
    this.setupBeforeUnloadHandler();
  }

  async ngOnInit(): Promise<void> {
    await this.event.initialize();
    if (this.destroyed) return;
    if (!this.event.canUpload()) {
      this.goBack();
      return;
    }
    // Check if a file was passed via router state from the gallery
    const passedState = history.state as { file?: File };

    if (passedState && passedState.file) {
      // Gallery Upload Flow: jump straight to preview
      this.isFromGallery.set(true);
      this.rawPhotoBlob.set(passedState.file);
      this.currentState.set('preview');
      this.feedbackService.triggerShutter();
    } else {
      // Camera Capture Flow: Auto-start camera
      this.startCamera();
    }
  }

  /** Navigate back to the Home screen */
  goBack(): void {
    this.stopCamera();
    this.router.navigate(['/home']);
  }

  /** Returns the color class for the photo counter based on remaining photos */
  getCounterColorClass(): string {
    return counterColorClass(this.photoLimitService.photosLeft());
  }

  // DEVICE & LIFECYCLE

  /** Detect iOS / Android / unknown for permission helper UI */
  private detectDevicePlatform(): void {
    this.devicePlatform.set(detectDevicePlatform(navigator.userAgent));
  }

  /** Warn users if they try to leave during upload */
  private setupBeforeUnloadHandler(): void {
    this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (this.isUploading()) {
        const msg = '¡La foto aún se está subiendo! ¿Seguro que quieres salir?';
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
      return undefined;
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  // CAMERA ACCESS (with constraint fallback)

  async startCamera(): Promise<void> {
    // Attempt to lock orientation to portrait (silently ignored on iOS)
    try {
      await (screen.orientation as any).lock('portrait');
    } catch (error) {
      // Normal on iOS and desktop — orientation lock is not supported there.
      this.logger.debug('Orientation lock not supported:', error);
    }

    try {
      this.errorMessage.set(null);
      this.permissionHelperVisible.set(false);

      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: this.facingMode(),
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (innerError) {
        if (innerError instanceof Error && innerError.name === 'OverconstrainedError') {
          this.logger.warn('1920x1080 not supported, falling back to 1280x720');
          constraints = {
            video: {
              facingMode: this.facingMode(),
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          };
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (fallbackError) {
            if (fallbackError instanceof Error && fallbackError.name === 'OverconstrainedError') {
              this.logger.warn('1280x720 not supported, using generic video constraints');
              constraints = {
                video: { facingMode: this.facingMode() },
                audio: false,
              };
              stream = await navigator.mediaDevices.getUserMedia(constraints);
            } else {
              throw fallbackError;
            }
          }
        } else {
          throw innerError;
        }
      }

      if (this.destroyed || !this.event.canUpload()) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }
      this.mediaStream = stream;
      this.currentState.set('viewfinder');

      // Wait for the video element to render, then assign stream
      setTimeout(() => {
        if (this.destroyed) return;
        const video = this.videoElement()?.nativeElement;
        if (video && stream) {
          video.srcObject = stream;
          void video.play();
          void this.enableContinuousFocus(stream.getVideoTracks()[0]);
        } else {
          this.logger.error('Video element not found after state change');
        }
      }, 100);
    } catch (error) {
      this.logger.error('Camera access error:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          this.feedbackService.triggerError();
          this.permissionHelperVisible.set(true);
          this.errorMessage.set(
            'Permiso de cámara denegado. Sigue las instrucciones de abajo para habilitar el acceso a la cámara.',
          );
        } else if (error.name === 'NotFoundError') {
          this.errorMessage.set('No se encontró ninguna cámara en este dispositivo.');
        } else {
          this.errorMessage.set('Error al acceder a la cámara. Por favor, inténtalo de nuevo.');
        }
      }
    }
  }

  /** Dismiss the permission helper modal */
  dismissPermissionHelper(): void {
    this.permissionHelperVisible.set(false);
  }

  /**
   * Flip the camera between front and back (environment/user).
   * Triggers a 3D flip animation and restarts the stream.
   */
  flipCamera(): void {
    if (this.isFlipping()) return;

    // 1. Start animation
    this.isFlipping.set(true);

    // 2. Wait 300ms (halfway through animation) to swap content
    setTimeout(async () => {
      // Stop current stream
      this.stopCamera();

      // Toggle facing mode
      const newMode = this.facingMode() === 'environment' ? 'user' : 'environment';
      this.facingMode.set(newMode);

      // Restart camera with new mode
      await this.startCamera();

      // 3. End animation after stream is ready (approx 600ms total)
      setTimeout(() => {
        this.isFlipping.set(false);
      }, 300);
    }, 300);
  }

  /**
   * A short, spatially-close double tap flips camera. A single tap requests
   * focus at that point when the browser/device exposes the camera controls.
   */
  handleViewfinderTap(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const now = performance.now();
    const previous = this.lastViewfinderTap;
    const distance = previous
      ? Math.hypot(event.clientX - previous.clientX, event.clientY - previous.clientY)
      : Number.POSITIVE_INFINITY;

    if (
      previous &&
      now - previous.at <= this.doubleTapWindowMs &&
      distance <= this.doubleTapDistancePx
    ) {
      this.lastViewfinderTap = null;
      this.clearFocusIndicator();
      this.flipCamera();
      return;
    }

    this.lastViewfinderTap = { at: now, clientX: event.clientX, clientY: event.clientY };
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const normalizedX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const normalizedY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    this.showFocusIndicator(normalizedX * 100, normalizedY * 100);
    void this.focusAt(normalizedX, normalizedY);
  }

  private async focusAt(x: number, y: number): Promise<void> {
    const track = this.mediaStream?.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & {
        focusMode?: string[];
        pointsOfInterest?: boolean;
      };
      const focusMode = capabilities?.focusMode?.includes('single-shot')
        ? 'single-shot'
        : capabilities?.focusMode?.includes('continuous')
          ? 'continuous'
          : undefined;
      const advanced: Record<string, unknown> = {};

      if (focusMode) advanced['focusMode'] = focusMode;
      if (capabilities?.pointsOfInterest) advanced['pointsOfInterest'] = [{ x, y }];
      if (Object.keys(advanced).length) {
        await track.applyConstraints({ advanced: [advanced as MediaTrackConstraintSet] });
      }
    } catch (error) {
      // Safari/iOS commonly keeps autofocus under native control.
      this.logger.debug('Tap-to-focus is not exposed by this browser:', error);
    }
  }

  private async enableContinuousFocus(track: MediaStreamTrack | undefined): Promise<void> {
    if (!track) return;
    try {
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & {
        focusMode?: string[];
      };
      if (capabilities?.focusMode?.includes('continuous')) {
        await track.applyConstraints({
          advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
        });
      }
    } catch (error) {
      this.logger.debug('Continuous focus is not exposed by this browser:', error);
    }
  }

  private showFocusIndicator(x: number, y: number): void {
    if (this.focusIndicatorTimeoutId) clearTimeout(this.focusIndicatorTimeoutId);
    this.focusPoint.set({ x, y });
    this.focusIndicatorTimeoutId = setTimeout(() => {
      this.focusPoint.set(null);
      this.focusIndicatorTimeoutId = null;
    }, 850);
  }

  private clearFocusIndicator(): void {
    if (this.focusIndicatorTimeoutId) clearTimeout(this.focusIndicatorTimeoutId);
    this.focusIndicatorTimeoutId = null;
    this.focusPoint.set(null);
  }

  // CAMERA CONTROLS (Grid & Flash)

  /** Toggle the 3×3 rule-of-thirds grid overlay */
  toggleGrid(): void {
    this.showGrid.update((v) => !v);
  }

  /** Toggle flash mode and attempt hardware torch */
  async toggleFlash(): Promise<void> {
    const newMode = this.flashMode() === 'off' ? 'on' : 'off';
    this.flashMode.set(newMode);

    // Attempt hardware torch (safe — will silently fail on iOS/unsupported)
    const track = this.mediaStream?.getVideoTracks()[0];
    if (track) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: newMode === 'on' } as any],
        });
      } catch (err) {
        // Keep flashMode as 'on' — the software screen flash will be used instead.
        this.logger.warn('Hardware flash not supported:', err);
      }
    }
  }

  /** Safely turn off hardware torch */
  private async turnOffTorch(): Promise<void> {
    const track = this.mediaStream?.getVideoTracks()[0];
    if (track) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: false } as any],
        });
      } catch (error) {
        // Torch may not be supported — nothing actionable, just trace it.
        this.logger.debug('Could not turn off hardware torch:', error);
      }
    }
  }

  // CAPTURE — viewfinder → preview (DIRECT, no editor)

  /** Open the device's native image picker without leaving the camera flow. */
  openDevicePhotoPicker(): void {
    this.cameraFileInput()?.nativeElement.click();
  }

  /** Use a device image in the same preview/upload flow as a camera capture. */
  onDeviceFileSelected(event: Event): void {
    if (!this.event.canUpload()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.stopCamera();
    this.isFromGallery.set(true);
    this.rawPhotoBlob.set(file);
    this.currentState.set('preview');
    this.feedbackService.triggerButtonPress();
  }

  /**
   * Capture the current video frame and transition DIRECTLY to preview.
   * If flash is on, triggers a software screen flash (white overlay) for 150ms
   * to illuminate faces before capturing.
   */
  async capturePhoto(): Promise<void> {
    if (!this.event.canUpload()) {
      this.goBack();
      return;
    }
    const video = this.videoElement()?.nativeElement;

    if (!video) {
      this.errorMessage.set('Cámara no preparada. Por favor, inténtalo de nuevo.');
      return;
    }

    // Trigger shutter feedback (haptic + audio + flash)
    this.feedbackService.triggerShutter();

    // If flash is on, show software screen flash and wait for illumination
    if (this.flashMode() === 'on') {
      this.isFlashing.set(true);
      await new Promise((resolve) => setTimeout(resolve, 150));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Create a temporary off-screen canvas to extract the frame
    const tempCanvas = document.createElement('canvas');
    // The viewfinder uses object-fit: cover. Crop the sensor frame to the same
    // aspect ratio so preview and final image exactly match what the guest saw.
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    const viewfinderRatio = video.clientWidth / video.clientHeight;
    const sourceRatio = sourceWidth / sourceHeight;
    let sourceX = 0;
    let sourceY = 0;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;

    if (sourceRatio > viewfinderRatio) {
      cropWidth = sourceHeight * viewfinderRatio;
      sourceX = (sourceWidth - cropWidth) / 2;
    } else if (sourceRatio < viewfinderRatio) {
      cropHeight = sourceWidth / viewfinderRatio;
      sourceY = (sourceHeight - cropHeight) / 2;
    }

    tempCanvas.width = Math.round(cropWidth);
    tempCanvas.height = Math.round(cropHeight);
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) {
      this.isFlashing.set(false);
      this.errorMessage.set('Error al capturar la foto. Por favor, inténtalo de nuevo.');
      return;
    }
    if (this.facingMode() === 'user') {
      ctx.translate(tempCanvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      video,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height,
    );

    // Turn off screen flash and hardware torch
    this.isFlashing.set(false);
    if (this.flashMode() === 'on') {
      await this.turnOffTorch();
    }

    // Convert to blob and go STRAIGHT to preview
    tempCanvas.toBlob(
      (blob) => {
        if (blob) {
          this.rawPhotoBlob.set(blob);
          this.currentState.set('preview');
          this.stopCamera();
        }
      },
      'image/jpeg',
      0.95,
    );
  }

  // PREVIEW — download & upload

  /**
   * Download the raw photo to the user's device.
   * Creates a temporary <a download> element and triggers a click.
   */
  downloadPhoto(): void {
    const blob = this.rawPhotoBlob();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    triggerBrowserDownload(url, 'lumen-photo.jpg');

    // Cleanup the object URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Discard photo and return to viewfinder (or home if from gallery) */
  discardPhoto(): void {
    this.rawPhotoBlob.set(null);
    this.dedicationModel.set({ dedication: '' });

    if (this.isFromGallery()) {
      // If it came from the gallery, discarding should take the user back
      this.router.navigate(['/home']);
    } else {
      // Otherwise restart the camera feed for another try
      this.startCamera();
    }
  }

  // UPLOAD — with compression & retry

  async uploadPhoto(): Promise<void> {
    if (!this.event.canUpload()) {
      this.errorMessage.set(
        'El álbum aún no admite fotos. Tu imagen sigue aquí; podrás compartirla cuando se abra.',
      );
      return;
    }
    const rawBlob = this.rawPhotoBlob();
    if (!rawBlob) return;

    try {
      this.currentState.set('uploading');
      this.isUploading.set(true);
      this.errorMessage.set(null);
      this.retryMessage.set(null);
      this.uploadProgress.set(0);

      // Compress the raw image
      const compressedFile = await imageCompression(
        new File([rawBlob], 'photo.jpg', { type: 'image/jpeg' }),
        {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          onProgress: (progress) => {
            this.uploadProgress.set(progress * 0.5); // Compression = 50% of total
          },
        },
      );

      this.uploadProgress.set(50);

      const dedication = this.dedicationModel().dedication || '';
      const result = await this.uploadQueue.enqueueAndUpload(compressedFile, dedication, {
        onStorageRetry: (attempt, maxAttempts) => {
          this.retryMessage.set(`Conexión débil. Reintentando (${attempt}/${maxAttempts})...`);
        },
        onStorageComplete: () => {
          this.retryMessage.set(null);
          this.uploadProgress.set(75);
        },
        onMetadataRetry: (attempt, maxAttempts) => {
          this.retryMessage.set(`Guardando la foto. Reintentando (${attempt}/${maxAttempts})...`);
        },
      });

      this.retryMessage.set(null);
      this.uploadProgress.set(100);
      this.isUploading.set(false);

      // Trigger success feedback
      this.feedbackService.triggerSuccess();

      // A queued photo is already durable, so releasing the in-memory blob and
      // navigating away is safe even though Supabase has not accepted it yet.
      this.currentState.set(result === 'published' ? 'success' : 'queued');
      if (result === 'published') {
        this.analytics.track('upload_success', {
          viewportWidth: window.innerWidth,
          online: navigator.onLine,
          source: this.isFromGallery() ? 'gallery' : 'camera',
        });
      }

      // Give the guest time to read the stronger offline confirmation.
      setTimeout(
        () => {
          this.rawPhotoBlob.set(null);
          this.dedicationModel.set({ dedication: '' });
          this.router.navigate(['/home']);
        },
        result === 'published' ? 1200 : 2200,
      );
    } catch (error) {
      this.logger.error('Upload error:', error);
      this.isUploading.set(false);
      this.retryMessage.set(null);
      this.errorMessage.set(
        'No se pudo guardar la foto de forma segura. Déjala abierta y pulsa "Reintentar subida".',
      );
      this.currentState.set('preview');
    }
  }

  /** Manually retry upload after all automatic retries fail */
  retryUpload(): void {
    this.errorMessage.set(null);
    this.uploadPhoto();
  }

  // INTERNAL HELPERS

  /** Stop the camera media stream */
  private stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  /** Cleanup on component destroy */
  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopCamera();
    this.clearFocusIndicator();
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }
}
