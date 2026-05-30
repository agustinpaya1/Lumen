import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase';
import { TUTORIAL_SEEN_KEY } from '../../core/constants';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class OnboardingComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly supabaseService = inject(SupabaseService);
  private autoNavTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    if (localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true') {
      this.router.navigate(['/home']);
      return;
    }
  }

  ngOnDestroy(): void {
    if (this.autoNavTimer) {
      clearTimeout(this.autoNavTimer);
      this.autoNavTimer = null;
    }
  }

  goToApp(): void {
    if (this.autoNavTimer) {
      clearTimeout(this.autoNavTimer);
      this.autoNavTimer = null;
    }
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    this.supabaseService.getDeviceId();

    this.router.navigate(['/home']);
  }
}
