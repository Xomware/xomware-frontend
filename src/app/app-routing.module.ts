import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { CommandCenterComponent } from './components/command-center/command-center.component';
import { AuthGateComponent } from './components/command-center/auth-gate/auth-gate.component';
import { AuthGuard } from './guards/auth.guard';
import { cognitoAuthGuard } from './guards/cognito-auth.guard';
import { adminGuard } from './guards/admin.guard';
import { SignInComponent } from './components/auth/sign-in/sign-in.component';
import { SignUpComponent } from './components/auth/sign-up/sign-up.component';
import { VerifyComponent } from './components/auth/verify/verify.component';
import { ForgotPasswordComponent } from './components/auth/forgot-password/forgot-password.component';
import { CallbackComponent } from './components/auth/callback/callback.component';
import { ProfileComponent } from './components/auth/profile/profile.component';
import { AdminComponent } from './components/admin/admin.component';
import { PrivacyComponent } from './components/privacy/privacy.component';
import { MusicComponent } from './components/music/music.component';

const routes: Routes = [
  // Landing is intentionally public so Google OAuth verification can confirm
  // the home page renders without login. The landing component already
  // tolerates `user: null` (no menu, just the public marketing view).
  { path: '', component: LandingComponent },
  { path: 'privacy', component: PrivacyComponent },
  // Public route — Dom's listening stats, no auth required
  { path: 'music', component: MusicComponent },
  { path: 'auth/sign-in', component: SignInComponent },
  { path: 'auth/sign-up', component: SignUpComponent },
  { path: 'auth/verify', component: VerifyComponent },
  { path: 'auth/forgot-password', component: ForgotPasswordComponent },
  { path: 'auth/callback', component: CallbackComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [cognitoAuthGuard] },
  { path: 'command/login', component: AuthGateComponent },
  { path: 'command', component: CommandCenterComponent, canActivate: [AuthGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
