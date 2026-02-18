import { Component, signal, computed, viewChild, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { CommonModule } from '@angular/common';
import imageCompression from 'browser-image-compression';
import confetti from 'canvas-confetti';
import { PhotoLimitService } from '../../core/services/photo-limit.service';
import { SupabaseService } from '../../core/services/supabase';
import { FeedbackService } from '../../core/services/feedback.service';
import { Router } from '@angular/router';

// ──────────────────────────────────────────────
// State Machine — 5 stable states (no editor)
// ──────────────────────────────────────────────
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
  // ──────────────────────────────────────────
  // Services
  // ──────────────────────────────────────────
  readonly photoLimitService = inject(PhotoLimitService);
  readonly feedbackService = inject(FeedbackService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);

  // ──────────────────────────────────────────
  // View children
  // ──────────────────────────────────────────
  readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoRef');

  // ──────────────────────────────────────────
  // Core state signals
  // ──────────────────────────────────────────
  readonly currentState = signal<CameraState>('viewfinder');
  readonly errorMessage = signal<string | null>(null);
  readonly uploadProgress = signal<number>(0);
  readonly isUploading = signal<boolean>(false);
  readonly retryMessage = signal<string | null>(null);
  readonly permissionHelperVisible = signal<boolean>(false);
  readonly devicePlatform = signal<'ios' | 'android' | 'unknown'>('unknown');

  // ──────────────────────────────────────────
  // Photo signals
  // ──────────────────────────────────────────

  /** Raw photo blob captured from viewfinder */
  readonly rawPhotoBlob = signal<Blob | null>(null);

  /** Object URL for displaying the raw photo in <img> */
  readonly rawPhotoUrl = computed<string | null>(() => {
    const blob = this.rawPhotoBlob();
    return blob ? URL.createObjectURL(blob) : null;
  });

  // ──────────────────────────────────────────
  // Media stream
  // ──────────────────────────────────────────
  private mediaStream: MediaStream | null = null;

  // ──────────────────────────────────────────
  // Signal Form for dedication text
  // ──────────────────────────────────────────
  private readonly dedicationModel = signal<DedicationModel>({ dedication: '' });
  readonly dedicationForm = form(this.dedicationModel);

  // ──────────────────────────────────────────
  // Computed signals
  // ──────────────────────────────────────────
  readonly isLimitReached = computed(() => this.photoLimitService.photosLeft() === 0);
  readonly canProceed = computed(() => this.photoLimitService.canTakePhoto());

  // ──────────────────────────────────────────
  // Beforeunload handler reference
  // ──────────────────────────────────────────
  private beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;

  constructor() {
    this.detectDevicePlatform();
    this.setupBeforeUnloadHandler();
  }

  ngOnInit(): void {
    // Auto-start camera when the component loads
    this.startCamera();
  }

  /** Navigate back to the Home screen */
  goBack(): void {
    this.stopCamera();
    this.router.navigate(['/home']);
  }

  // ============================================================
  // DEVICE & LIFECYCLE
  // ============================================================

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

  // ============================================================
  // CAMERA ACCESS (with constraint fallback)
  // ============================================================

  async startCamera(): Promise<void> {
    try {
      this.errorMessage.set(null);
      this.permissionHelperVisible.set(false);

      let constraints: MediaStreamConstraints = {
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      };

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (innerError) {
        if (innerError instanceof Error && innerError.name === 'OverconstrainedError') {
          console.warn('1920x1080 not supported, falling back to 1280x720');
          constraints = {
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          };
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (fallbackError) {
            if (fallbackError instanceof Error && fallbackError.name === 'OverconstrainedError') {
              console.warn('1280x720 not supported, using generic video constraints');
              constraints = { video: true, audio: false };
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
          console.error('Video element not found after state change');
        }
      }, 100);
    } catch (error) {
      console.error('Camera access error:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
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

  // ============================================================
  // CAPTURE — viewfinder → preview (DIRECT, no editor)
  // ============================================================

  /**
   * Capture the current video frame and transition DIRECTLY to preview.
   * Uses a temporary off-screen canvas (no ViewChild needed).
   */
  async capturePhoto(): Promise<void> {
    const video = this.videoElement()?.nativeElement;

    if (!video) {
      this.errorMessage.set('Camera not ready. Please try again.');
      return;
    }

    // Trigger shutter feedback (haptic + audio + flash)
    this.feedbackService.triggerShutter();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create a temporary off-screen canvas to extract the frame
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) {
      this.errorMessage.set('Failed to capture photo. Please try again.');
      return;
    }
    ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

    // Convert to blob and go STRAIGHT to preview
    tempCanvas.toBlob((blob) => {
      if (blob) {
        this.rawPhotoBlob.set(blob);
        this.currentState.set('preview');
        this.stopCamera();
      }
    }, 'image/jpeg', 0.95);
  }

  // ============================================================
  // PREVIEW — download & upload
  // ============================================================

  /**
   * Download the raw photo to the user's device.
   * Creates a temporary <a download> element and triggers a click.
   */
  downloadPhoto(): void {
    const blob = this.rawPhotoBlob();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lumen-photo.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Cleanup the object URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Discard photo and return to viewfinder */
  discardPhoto(): void {
    this.rawPhotoBlob.set(null);
    this.dedicationModel.set({ dedication: '' });
    this.startCamera();
  }

  // ============================================================
  // UPLOAD — with compression & retry
  // ============================================================

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

      // Trigger success feedback and confetti
      this.feedbackService.triggerSuccess();
      this.triggerConfetti();

      // Show success state
      this.currentState.set('success');

      // Reset after 3 seconds and navigate back to Home
      setTimeout(() => {
        this.rawPhotoBlob.set(null);
        this.dedicationModel.set({ dedication: '' });
        this.router.navigate(['/home']);
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
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

  // ============================================================
  // INTERNAL HELPERS
  // ============================================================

  /** Stop the camera media stream */
  private stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  /** Trigger confetti celebration 🎉 */
  private triggerConfetti(): void {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  }

  /** Cleanup on component destroy */
  ngOnDestroy(): void {
    this.stopCamera();
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }
}
