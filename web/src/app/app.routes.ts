import { Routes } from '@angular/router';
import { CameraComponent } from '@features/camera/camera';
import { OnboardingComponent } from '@features/onboarding/onboarding';
import { HomeComponent } from '@features/home/home';

export const routes: Routes = [
    { path: '', component: OnboardingComponent },
    { path: 'home', component: HomeComponent },
    { path: 'camera', component: CameraComponent },
    { path: 'admin', loadComponent: () => import('@features/admin/admin').then(m => m.AdminComponent) },
    { path: '**', redirectTo: 'home' }
];
