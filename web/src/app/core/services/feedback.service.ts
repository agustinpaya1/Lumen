import { inject, Injectable, signal } from '@angular/core';
import { LoggerService } from './logger.service';

/**
* FeedbackService provides haptic, audio, and visual feedback for the camera
* to create delightful micro-interactions and enhance the "game feel".
*/
@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private readonly logger = inject(LoggerService);

  // Flash animation state
  readonly flashActive = signal<boolean>(false);

  // Audio elements
  private shutterSound: HTMLAudioElement | null = null;
  private successSound: HTMLAudioElement | null = null;

  // Base64 encoded audio (short shutter click sound - ~0.1s)
  private readonly SHUTTER_AUDIO =
    'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7////////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7kGQAD/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

  // Base64 encoded audio (short success chime - ~0.3s)
  private readonly SUCCESS_AUDIO =
    'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAADAAAFVgBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq////////////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7kGQAD/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

  constructor() {
    this.preloadAudio();
  }

  /**
   * Preload audio files for instant playback
   */
  private preloadAudio(): void {
    try {
      this.shutterSound = new Audio(this.SHUTTER_AUDIO);
      this.shutterSound.preload = 'auto';
      this.shutterSound.volume = 0.6;

      this.successSound = new Audio(this.SUCCESS_AUDIO);
      this.successSound.preload = 'auto';
      this.successSound.volume = 0.4;
    } catch (error) {
      this.logger.warn('Audio preload failed:', error);
    }
  }

  /**
   * Trigger haptic vibration (mobile only)
   */
  private vibrate(duration: number = 20): void {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch (error) {
        // Silently fail if vibration is not supported
        this.logger.debug('Vibration not supported:', error);
      }
    }
  }

  /**
   * Play audio with error handling
   */
  private playSound(audio: HTMLAudioElement | null): void {
    if (!audio) return;

    try {
      // Reset to start if already playing
      audio.currentTime = 0;
      audio.play().catch(error => {
        // Silently fail - user might not have interacted with page yet
        this.logger.debug('Audio play failed:', error);
      });
    } catch (error) {
      this.logger.debug('Audio playback error:', error);
    }
  }

  /**
   * Trigger camera flash effect
   */
  private triggerFlash(): void {
    this.flashActive.set(true);

    // Auto-reset after 150ms
    setTimeout(() => {
      this.flashActive.set(false);
    }, 150);
  }

  /**
   * Complete shutter feedback: haptic + audio + flash
   */
  triggerShutter(): void {
    this.vibrate(20);
    this.playSound(this.shutterSound);
    this.triggerFlash();
  }

  /**
   * Complete success feedback: haptic + audio
   */
  triggerSuccess(): void {
    this.vibrate(50); // Longer vibration for success
    this.playSound(this.successSound);
  }

  /**
   * Simple haptic feedback for button presses
   */
  triggerButtonPress(): void {
    this.vibrate(10); // Short, subtle vibration
  }
}
