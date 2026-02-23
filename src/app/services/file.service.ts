import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface WorkspaceFile {
  name: string;
  size?: number;
  lastModified?: string;
  content?: string;
}

@Injectable({ providedIn: 'root' })
export class FileService {
  private readonly baseUrl = environment.apiBaseUrl + '/config/files';

  constructor(private auth: AuthService) {}

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Auth-Hash': this.auth.getPassphraseHash(),
    };
  }

  async listFiles(): Promise<WorkspaceFile[]> {
    const res = await fetch(this.baseUrl, { headers: this.headers });
    if (!res.ok) throw new Error(`Failed to list files: ${res.status}`);
    const data = await res.json();
    return data.files;
  }

  async getFile(filename: string): Promise<WorkspaceFile> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(filename)}`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Failed to read file: ${res.status}`);
    return res.json();
  }

  async saveFile(filename: string, content: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(`Failed to save file: ${res.status}`);
  }
}
