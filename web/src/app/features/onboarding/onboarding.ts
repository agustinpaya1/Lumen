import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-onboarding',
    standalone: true,
    templateUrl: './onboarding.html',
    styleUrl: './onboarding.scss',
})
export class OnboardingComponent implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private autoNavTimer: ReturnType<typeof setTimeout> | null = null;

    ngOnInit(): void {
        // If user has already seen onboarding, skip straight to home
        if (localStorage.getItem('hasSeenTutorial') === 'true') {
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

    /** Manual skip — clears the silent timer and navigates immediately */
    goToApp(): void {
        if (this.autoNavTimer) {
            clearTimeout(this.autoNavTimer);
            this.autoNavTimer = null;
        }
        localStorage.setItem('hasSeenTutorial', 'true');
        this.router.navigate(['/home']);
    }
}
