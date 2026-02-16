import { Component, signal, computed, viewChild, ElementRef, inject } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { CommonModule } from '@angular/common';
import imageCompression from 'browser-image-compression';
import confetti from 'canvas-confetti';
import { PhotoLimitService } from '../../core/services/photo-limit.service';
import { SupabaseService } from '../../core/services/supabase';
import { FeedbackService } from '../../core/services/feedback.service';

type CameraState = 'landing' | 'viewfinder' | 'preview' | 'uploading' | 'success';

interface CapturedImage {
  blob: Blob;
  dataUrl: string;
}

interface DedicationModel {
  dedication: string;
}

@Component({
  selector: 'app-camera',
  imports: [CommonModule, FormField],
  templateUrl: './camera.html',
  styleUrl: './camera.scss',
})
export class CameraComponent {
  // Services
  readonly photoLimitService = inject(PhotoLimitService);
  readonly feedbackService = inject(FeedbackService);
  private readonly supabaseService = inject(SupabaseService);

  // View children
  readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoRef');
  readonly canvasElement = viewChild<ElementRef<HTMLCanvasElement>>('canvasRef');

  // State signals
  readonly currentState = signal<CameraState>('landing');
  readonly errorMessage = signal<string | null>(null);
  readonly capturedImage = signal<CapturedImage | null>(null);
  readonly uploadProgress = signal<number>(0);
  readonly isPhotoRevealing = signal<boolean>(false);

  // Media stream
  private mediaStream: MediaStream | null = null;

  // Signal Form for dedication
  private readonly dedicationModel = signal<DedicationModel>({ dedication: '' });
  readonly dedicationForm = form(this.dedicationModel);

  // Computed signals
  readonly isLimitReached = computed(() => this.photoLimitService.photosLeft() === 0);
  readonly canProceed = computed(() => this.photoLimitService.canTakePhoto());

  /**
   * Start the camera and request media permissions
   */
  async startCamera(): Promise<void> {
    try {
      this.errorMessage.set(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      this.mediaStream = stream;

      // Set state to viewfinder FIRST so the video element gets rendered
      this.currentState.set('viewfinder');

      // Wait for next tick to ensure video element is rendered
      setTimeout(() => {
        const video = this.videoElement()?.nativeElement;
        if (video) {
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
          this.errorMessage.set('Camera permission denied. Please allow camera access to take photos.');
        } else if (error.name === 'NotFoundError') {
          this.errorMessage.set('No camera found on this device.');
        } else {
          this.errorMessage.set('Failed to access camera. Please try again.');
        }
      }
    }
  }

  /**
   * Capture the current video frame to canvas and convert to blob
   */
  async capturePhoto(): Promise<void> {
    const video = this.videoElement()?.nativeElement;
    const canvas = this.canvasElement()?.nativeElement;

    if (!video || !canvas) {
      this.errorMessage.set('Camera not ready. Please try again.');
      return;
    }

    // Trigger shutter feedback (haptic + audio + flash)
    this.feedbackService.triggerShutter();

    // Small delay to let flash animation play
    await new Promise(resolve => setTimeout(resolve, 100));

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.errorMessage.set('Failed to capture photo. Please try again.');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const dataUrl = canvas.toDataURL('image/jpeg');
        this.capturedImage.set({ blob, dataUrl });
        this.currentState.set('preview');

        // Start the Polaroid developing animation
        this.isPhotoRevealing.set(true);

        // Auto-hide reveal text after 2 seconds
        setTimeout(() => {
          this.isPhotoRevealing.set(false);
        }, 2000);

        // Stop the video stream temporarily
        this.stopCamera();
      }
    }, 'image/jpeg', 0.95);
  }

  /**
   * Discard the captured photo and return to viewfinder
   */
  discardPhoto(): void {
    this.capturedImage.set(null);
    this.dedicationModel.set({ dedication: '' });
    this.isPhotoRevealing.set(false);
    this.startCamera();
  }

  /**
   * Upload the photo to Supabase with compression
   */
  async uploadPhoto(): Promise<void> {
    const captured = this.capturedImage();
    if (!captured) return;

    try {
      this.currentState.set('uploading');
      this.errorMessage.set(null);
      this.uploadProgress.set(0);

      // Compress the image
      const compressedFile = await imageCompression(
        new File([captured.blob], 'photo.jpg', { type: 'image/jpeg' }),
        {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          onProgress: (progress) => {
            this.uploadProgress.set(progress * 0.5); // Compression is 50% of total
          }
        }
      );

      this.uploadProgress.set(50);

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const filename = `photo_${timestamp}.jpg`;
      const filepath = `uploads/${filename}`;

      // Upload to Supabase
      const { error: uploadError } = await this.supabaseService.uploadPhoto(
        compressedFile,
        filepath
      );

      if (uploadError) {
        throw uploadError;
      }

      this.uploadProgress.set(75);

      // Get the dedication text
      const dedication = this.dedicationModel().dedication || '';

      // Save photo metadata (optional - you can expand this)
      const publicUrl = `${filepath}`;
      await this.supabaseService.savePhotoData(publicUrl, dedication);

      this.uploadProgress.set(100);

      // Decrement the photo count
      this.photoLimitService.decrementCount();

      // Trigger success feedback and confetti
      this.feedbackService.triggerSuccess();
      this.triggerConfetti();

      // Show success state
      this.currentState.set('success');

      // Reset after 3 seconds and return to viewfinder
      setTimeout(() => {
        this.capturedImage.set(null);
        this.dedicationModel.set({ dedication: '' });
        this.isPhotoRevealing.set(false);

        if (this.photoLimitService.canTakePhoto()) {
          this.startCamera();
        } else {
          this.currentState.set('landing');
        }
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      this.errorMessage.set('Failed to upload photo. Please try again.');
      this.currentState.set('preview');
    }
  }

  /**
   * Stop the camera stream
   */
  private stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  /**
   * Trigger confetti celebration
   */
  private triggerConfetti(): void {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti from multiple positions
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  }

  /**
   * Cleanup on component destroy
   */
  ngOnDestroy(): void {
    this.stopCamera();
  }
}

