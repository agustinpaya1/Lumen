import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '@core/services/session.service';
import { LUMEN_CONSENT_KEY, TUTORIAL_SEEN_KEY } from '@core/constants';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class OnboardingComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private autoNavTimer: ReturnType<typeof setTimeout> | null = null;

  showConsentModal = false;
  consentDeclined = false;

  ngOnInit(): void {
    if (localStorage.getItem(LUMEN_CONSENT_KEY) !== 'true') {
      this.showConsentModal = true;
      return;
    }
    this.proceedAfterConsent();
  }

  ngOnDestroy(): void {
    if (this.autoNavTimer) {
      clearTimeout(this.autoNavTimer);
      this.autoNavTimer = null;
    }
  }

  acceptConsent(): void {
    localStorage.setItem(LUMEN_CONSENT_KEY, 'true');
    this.showConsentModal = false;
    this.proceedAfterConsent();
  }

  declineConsent(): void {
    this.showConsentModal = false;
    this.consentDeclined = true;
  }

  goToApp(): void {
    if (this.autoNavTimer) {
      clearTimeout(this.autoNavTimer);
      this.autoNavTimer = null;
    }
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    this.sessionService.getDeviceId();
    this.router.navigate(['/home']);
  }

  private proceedAfterConsent(): void {
    if (localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true') {
      this.router.navigate(['/home']);
    }
  }
}
