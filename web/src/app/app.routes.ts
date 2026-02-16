import { Routes } from '@angular/router';
import { CameraComponent } from './features/camera/camera';
import { OnboardingComponent } from './features/onboarding/onboarding';

export const routes: Routes = [
    { path: '', component: OnboardingComponent },
    { path: 'camera', component: CameraComponent },
    { path: '**', redirectTo: '' }
];