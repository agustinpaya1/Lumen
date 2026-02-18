import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-onboarding',
    standalone: true,
    templateUrl: './onboarding.html',
    styleUrl: './onboarding.scss',
})
export class OnboardingComponent implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

    /** Current step: 1 = branded welcome, 2 = concept explainer */
    readonly step = signal<number>(1);

    /** Controls fade-out / fade-in transition between steps */
    readonly transitioning = signal<boolean>(false);

    ngOnInit(): void {
        // If already seen, skip straight to camera
        if (localStorage.getItem('hasSeenTutorial') === 'true') {
            this.router.navigate(['/home']);
            return;
        }

        // Auto-advance from step 1 → step 2 after 3 seconds
        this.autoAdvanceTimer = setTimeout(() => {
            this.goToStep2();
        }, 3000);
    }

    ngOnDestroy(): void {
        if (this.autoAdvanceTimer) {
            clearTimeout(this.autoAdvanceTimer);
        }
    }

    /** Transition from splash → explainer */
    goToStep2(): void {
        if (this.step() === 2) return;

        // Clear the auto-advance timer if user tapped manually
        if (this.autoAdvanceTimer) {
            clearTimeout(this.autoAdvanceTimer);
            this.autoAdvanceTimer = null;
        }

        this.transitioning.set(true);

        // Wait for fade-out, then swap content & fade-in
        setTimeout(() => {
            this.step.set(2);
            this.transitioning.set(false);
        }, 400);
    }

    /** Complete onboarding and navigate to camera */
    startShooting(): void {
        localStorage.setItem('hasSeenTutorial', 'true');
        this.router.navigate(['/home']);
    }
}
