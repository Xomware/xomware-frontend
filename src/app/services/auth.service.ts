import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // SHA-256 hash of the passphrase — change this to set a new password
  // Default: "xomware-command" → update via: echo -n "yourpass" | shasum -a 256
  private readonly PASSPHRASE_HASH = 'f5cfeb6a77a383b90d0f0f6ce955b832e3318a8b6c3343cda075fe48e0859078';
  private readonly STORAGE_KEY = 'xom_cmd_auth';
  private readonly SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  isAuthenticated(): boolean {
    const session = localStorage.getItem(this.STORAGE_KEY);
    if (!session) return false;
    try {
      const { expiry } = JSON.parse(session);
      if (Date.now() > expiry) {
        localStorage.removeItem(this.STORAGE_KEY);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async authenticate(passphrase: string): Promise<boolean> {
    const hash = await this.sha256(passphrase);
    if (hash === this.PASSPHRASE_HASH) {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({ expiry: Date.now() + this.SESSION_DURATION, hash })
      );
      return true;
    }
    return false;
  }

  getPassphraseHash(): string {
    const session = localStorage.getItem(this.STORAGE_KEY);
    if (!session) return '';
    try {
      const { hash } = JSON.parse(session);
      return hash || '';
    } catch {
      return '';
    }
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
