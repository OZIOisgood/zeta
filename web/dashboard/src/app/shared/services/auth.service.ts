import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EnvService } from './env.service';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  language: string;
  profile_picture_url?: string;
  role: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private env = inject(EnvService);
  private get baseUrl() { return `${this.env.apiUrl}/auth`; }

  user = signal<User | null>(null);
  loading = signal(true);
  unauthenticated = signal(false);

  checkSession(): Promise<void> {
    this.loading.set(true);
    return firstValueFrom(this.http.get<User>(`${this.baseUrl}/me`))
      .then((u) => {
        this.user.set(u);
        this.unauthenticated.set(false);
        this.loading.set(false);
      })
      .catch((err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.unauthenticated.set(true);
        }
        this.user.set(null);
        this.loading.set(false);
      });
  }

  login() {
    window.location.href = `${this.baseUrl}/login`;
  }

  consumeRedirectPath(): string | null {
    const raw = localStorage.getItem('zeta_redirect_after_login');
    if (!raw) {
      return null;
    }
    localStorage.removeItem('zeta_redirect_after_login');
    try {
      const entry = JSON.parse(raw) as { path: string; expiresAt: number };
      if (Date.now() > entry.expiresAt) {
        return null;
      }
      const currentPath = window.location.pathname + window.location.search;
      if (entry.path === currentPath) {
        return null;
      }
      return entry.path;
    } catch {
      return null;
    }
  }

  logout() {
    this.http.post<{ logoutUrl: string }>(`${this.baseUrl}/logout`, {}).subscribe({
      next: (res) => {
        if (res.logoutUrl) {
          window.location.href = res.logoutUrl;
        } else {
          window.location.reload();
        }
      },
      error: () => {
        window.location.reload();
      },
    });
  }

  updateUser(data: {
    first_name: string;
    last_name: string;
    language: string;
    avatar?: string;
  }): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/me`, data).pipe(tap((user) => this.user.set(user)));
  }
}
