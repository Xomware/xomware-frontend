import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { CommandCenterComponent } from './components/command-center/command-center.component';
import { AuthGateComponent } from './components/command-center/auth-gate/auth-gate.component';
import { AuthGuard } from './guards/auth.guard';
import { PrDashboardComponent } from './components/pr-dashboard/pr-dashboard.component';

const routes: Routes = [
  { path: '', component: LandingComponent },
  // Standalone feature routes (no auth required — public data)
  { path: 'prs', component: PrDashboardComponent },
  // Standalone /ci route (no auth required — public CI data)
  { path: 'ci', redirectTo: 'command/ci', pathMatch: 'full' },
  // Redirect bare /command to the default tab
  { path: 'command', redirectTo: 'command/board', pathMatch: 'full' },
  // Login must come before the :tab wildcard
  { path: 'command/login', component: AuthGateComponent },
  // Child tab routes — kanban→board, files, activity, infra, office, analytics, prs, ci, issues
  { path: 'command/:tab', component: CommandCenterComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
