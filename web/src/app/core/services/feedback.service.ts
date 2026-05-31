import { inject, Injectable, signal } from '@angular/core';
import { Howl } from 'howler';
import { LoggerService } from './logger.service';

/**
 * Haptic, audio, and visual feedback for the camera — the micro-interactions
 * that give photo capture its "game feel".
 */
@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private readonly logger = inject(LoggerService);

  // Flash animation state
  readonly flashActive = signal<boolean>(false);

  private readonly shutterSound = new Howl({
    src: ['/assets/sounds/shutter.mp3'],
    volume: 0.7,
    preload: true,
  });

  private readonly successSound = new Howl({
    src: ['/assets/sounds/success.mp3'],
    volume: 0.6,
    preload: true,
  });

  // navigator.vibrate() is not supported on iOS Safari — this is an OS
  // restriction, not a JS limitation. Haptics on iOS require a native wrapper
  // (Capacitor/Cordova). Calls fail silently; audio feedback covers iOS users.
  private vibrate(pattern: number | number[]): void {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently fail — some browsers expose the API but block it
      }
    }
  }

  private triggerFlash(): void {
    this.flashActive.set(true);
    setTimeout(() => this.flashActive.set(false), 150);
  }

  /** Complete shutter feedback: haptic + audio + flash */
  triggerShutter(): void {
    this.vibrate(20);
    this.shutterSound.play();
    this.triggerFlash();
  }

  /** Complete success feedback: haptic + audio */
  triggerSuccess(): void {
    this.vibrate(50);
    this.successSound.play();
  }

  /** Simple haptic feedback for button presses */
  triggerButtonPress(): void {
    this.vibrate(10);
  }

  /** Warning haptic for limit or gated actions (vibration only — no audio) */
  triggerWarning(): void {
    this.vibrate([50, 50, 50]);
  }

  /** Error haptic for denied permissions or hard failures (vibration only — no audio) */
  triggerError(): void {
    this.vibrate([100, 50, 100]);
  }
}
