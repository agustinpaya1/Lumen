import { Routes } from '@angular/router';
import { CameraComponent } from './features/camera/camera';
import { OnboardingComponent } from './features/onboarding/onboarding';
import { AdminComponent } from './features/admin/admin';

export const routes: Routes = [
    { path: '', component: OnboardingComponent },
    { path: 'camera', component: CameraComponent },
    { path: 'admin', component: AdminComponent },
    { path: '**', redirectTo: '' }
];