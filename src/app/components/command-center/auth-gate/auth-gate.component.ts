import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-auth-gate',
  templateUrl: './auth-gate.component.html',
  styleUrls: ['./auth-gate.component.scss'],
})
export class AuthGateComponent {
  passphrase = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/command']);
    }
  }

  async onSubmit(): Promise<void> {
    this.loading = true;
    this.error = '';
    const ok = await this.auth.authenticate(this.passphrase);
    this.loading = false;
    if (ok) {
      this.router.navigate(['/command']);
    } else {
      this.error = 'Invalid passphrase';
      this.passphrase = '';
    }
  }
}
