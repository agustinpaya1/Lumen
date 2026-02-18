import { Routes } from '@angular/router';
import { CameraComponent } from './features/camera/camera';
import { OnboardingComponent } from './features/onboarding/onboarding';
import { AdminComponent } from './features/admin/admin';
import { HomeComponent } from './features/home/home';

export const routes: Routes = [
    { path: '', component: OnboardingComponent },
    { path: 'home', component: HomeComponent },
    { path: 'camera', component: CameraComponent },
    { path: 'admin', component: AdminComponent },
    { path: '**', redirectTo: 'home' }
];