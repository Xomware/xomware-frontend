import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { CommandCenterComponent } from './components/command-center/command-center.component';
import { AuthGateComponent } from './components/command-center/auth-gate/auth-gate.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'command', component: CommandCenterComponent, canActivate: [AuthGuard] },
  { path: 'command/login', component: AuthGateComponent },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
