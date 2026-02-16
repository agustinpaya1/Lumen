import { Component, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-onboarding',
    imports: [CommonModule],
    templateUrl: './onboarding.html',
    styleUrl: './onboarding.scss',
})
export class OnboardingComponent implements OnInit {
    private readonly router = inject(Router);

    // State signals
    readonly showSplash = signal<boolean>(true);
    readonly currentSlide = signal<number>(0);
    readonly isComplete = signal<boolean>(false);

    // Slide data
    readonly slides = [
        {
            icon: '💒',
            title: 'Bienvenido',
            description: 'Captura los momentos únicos de la boda.'
        },
        {
            icon: '📷',
            title: 'Estilo Polaroid',
            description: 'Haz fotos vintage. ¡El revelado es automático!'
        },
        {
            icon: '🔢',
            title: 'La Regla de Oro',
            description: 'Solo tienes 10 fotos. ¡Haz que cuenten!'
        }
    ];

    ngOnInit(): void {
        // Check if user has already seen the tutorial
        const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');

        if (hasSeenTutorial === 'true') {
            // Navigate directly to camera
            this.router.navigate(['/camera']);
            return;
        }

        // Start splash screen animation sequence
        this.startSplashSequence();
    }

    /**
     * Start the splash screen animation
     * Fades in logo, holds for 1.5s, then transitions to carousel
     */
    private startSplashSequence(): void {
        // Hide splash after 2.5 seconds (animation duration)
        setTimeout(() => {
            this.showSplash.set(false);
        }, 2500);
    }

    /**
     * Navigate to next slide or complete onboarding
     */
    nextSlide(): void {
        const current = this.currentSlide();

        if (current < this.slides.length - 1) {
            this.currentSlide.set(current + 1);
        } else {
            this.completeOnboarding();
        }
    }

    /**
     * Skip tutorial and go directly to camera
     */
    skipTutorial(): void {
        this.completeOnboarding();
    }

    /**
     * Mark onboarding as complete and navigate to camera
     */
    private completeOnboarding(): void {
        localStorage.setItem('hasSeenTutorial', 'true');
        this.isComplete.set(true);
        this.router.navigate(['/camera']);
    }

    /**
     * Handle carousel scroll event to update indicator
     */
    onCarouselScroll(event: Event): void {
        const container = event.target as HTMLElement;
        const slideWidth = container.offsetWidth;
        const scrollLeft = container.scrollLeft;
        const slideIndex = Math.round(scrollLeft / slideWidth);

        this.currentSlide.set(slideIndex);
    }

    /**
     * Scroll to specific slide
     */
    goToSlide(index: number): void {
        this.currentSlide.set(index);

        // Scroll to the slide
        const container = document.querySelector('.carousel-track') as HTMLElement;
        if (container) {
            container.scrollTo({
                left: index * container.offsetWidth,
                behavior: 'smooth'
            });
        }
    }
}
