import { Component, signal, computed, viewChild, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { CommonModule } from '@angular/common';
import imageCompression from 'browser-image-compression';
import { PhotoLimitService } from '@core/services/photo-limit.service';
import { SupabaseService } from '@core/services/supabase.service';
import { FeedbackService } from '@core/services/feedback.service';
import { LoggerService } from '@core/services/logger.service';
import { triggerBrowserDownload } from '@core/utils/download';
import { Router } from '@angular/router';

// State Machine — 5 stable states (no editor)
type CameraState = 'viewfinder' | 'preview' | 'uploading' | 'success';

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
  // Services
  readonly photoLimitService = inject(PhotoLimitService);
  readonly feedbackService = inject(FeedbackService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);

  // View children
  readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoRef');

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

  // Signal Form for dedication text
  private readonly dedicationModel = signal<DedicationModel>({ dedication: '' });
  readonly dedicationForm = form(this.dedicationModel);

  // Computed signals
  readonly isLimitReached = computed(() => this.photoLimitService.photosLeft() === 0);
  readonly canProceed = computed(() => this.photoLimitService.canTakePhoto());

  // Beforeunload handler reference
  private beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;

  constructor() {
    this.detectDevicePlatform();
    this.setupBeforeUnloadHandler();
  }

  ngOnInit(): void {
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
    const remaining = this.photoLimitService.photosLeft();
    if (remaining > 3) return 'text-white';
    if (remaining > 1) return 'text-yellow-300';
    return 'text-red-400';
  }

  // DEVICE & LIFECYCLE

  /** Detect iOS / Android / unknown for permission helper UI */
  private detectDevicePlatform(): void {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      this.devicePlatform.set('ios');
    } else if (/android/.test(ua)) {
      this.devicePlatform.set('android');
    } else {
      this.devicePlatform.set('unknown');
    }
  }

  /** Warn users if they try to leave during upload */
  private setupBeforeUnloadHandler(): void {
    this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (this.isUploading()) {
        const msg = 'Photo is still uploading! Are you sure you want to leave?';
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
          height: { ideal: 1080 }
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
              height: { ideal: 720 }
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
                audio: false
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

      this.mediaStream = stream;
      this.currentState.set('viewfinder');

      // Wait for the video element to render, then assign stream
      setTimeout(() => {
        const video = this.videoElement()?.nativeElement;
        if (video && stream) {
          video.srcObject = stream;
          video.play();
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
          this.errorMessage.set('Camera permission denied. Please follow the instructions below to enable camera access.');
        } else if (error.name === 'NotFoundError') {
          this.errorMessage.set('No camera found on this device.');
        } else {
          this.errorMessage.set('Failed to access camera. Please try again.');
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
   * Public alias for flipCamera(), bound to (dblclick) on the video wrapper.
   * Allows users to double-tap the viewfinder to switch between cameras.
   */
  toggleCamera(): void {
    this.flipCamera();
  }

  // CAMERA CONTROLS (Grid & Flash)

  /** Toggle the 3×3 rule-of-thirds grid overlay */
  toggleGrid(): void {
    this.showGrid.update(v => !v);
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
          advanced: [{ torch: newMode === 'on' } as any]
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
          advanced: [{ torch: false } as any]
        });
      } catch (error) {
        // Torch may not be supported — nothing actionable, just trace it.
        this.logger.debug('Could not turn off hardware torch:', error);
      }
    }
  }

  // CAPTURE — viewfinder → preview (DIRECT, no editor)

  /**
   * Capture the current video frame and transition DIRECTLY to preview.
   * If flash is on, triggers a software screen flash (white overlay) for 150ms
   * to illuminate faces before capturing.
   */
  async capturePhoto(): Promise<void> {
    const video = this.videoElement()?.nativeElement;

    if (!video) {
      this.errorMessage.set('Camera not ready. Please try again.');
      return;
    }

    // Trigger shutter feedback (haptic + audio + flash)
    this.feedbackService.triggerShutter();

    // If flash is on, show software screen flash and wait for illumination
    if (this.flashMode() === 'on') {
      this.isFlashing.set(true);
      await new Promise(resolve => setTimeout(resolve, 150));
    } else {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Create a temporary off-screen canvas to extract the frame
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) {
      this.isFlashing.set(false);
      this.errorMessage.set('Failed to capture photo. Please try again.');
      return;
    }
    ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

    // Turn off screen flash and hardware torch
    this.isFlashing.set(false);
    if (this.flashMode() === 'on') {
      await this.turnOffTorch();
    }

    // Convert to blob and go STRAIGHT to preview
    tempCanvas.toBlob((blob) => {
      if (blob) {
        this.rawPhotoBlob.set(blob);
        this.currentState.set('preview');
        this.stopCamera();
      }
    }, 'image/jpeg', 0.95);
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
        }
      );

      this.uploadProgress.set(50);

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `photo_${timestamp}.jpg`;
      const filepath = `uploads/${filename}`;

      // Upload to Supabase WITH RETRY
      const { error: uploadError } = await this.supabaseService.uploadPhotoWithRetry(
        compressedFile,
        filepath,
        (attempt, maxAttempts) => {
          this.retryMessage.set(`Connection weak. Retrying (${attempt}/${maxAttempts})...`);
        }
      );

      if (uploadError) throw uploadError;

      this.retryMessage.set(null);
      this.uploadProgress.set(75);

      // Save photo metadata WITH RETRY
      const dedication = this.dedicationModel().dedication || '';
      await this.supabaseService.savePhotoDataWithRetry(
        filepath,
        dedication,
        (attempt, maxAttempts) => {
          this.retryMessage.set(`Saving metadata. Retrying (${attempt}/${maxAttempts})...`);
        }
      );

      this.retryMessage.set(null);
      this.uploadProgress.set(100);
      this.isUploading.set(false);

      // Decrement the photo count
      this.photoLimitService.decrementCount();

      // Trigger success feedback
      this.feedbackService.triggerSuccess();

      // Show success state
      this.currentState.set('success');

      // Reset after 1.2 seconds and navigate back to Home
      setTimeout(() => {
        this.rawPhotoBlob.set(null);
        this.dedicationModel.set({ dedication: '' });
        this.router.navigate(['/home']);
      }, 1200);

    } catch (error) {
      this.logger.error('Upload error:', error);
      this.isUploading.set(false);
      this.retryMessage.set(null);
      this.errorMessage.set(
        'Failed to upload photo after multiple attempts. Photo is saved locally — tap "Retry Upload" to try again.'
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
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }



  /** Cleanup on component destroy */
  ngOnDestroy(): void {
    this.stopCamera();
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }
}
