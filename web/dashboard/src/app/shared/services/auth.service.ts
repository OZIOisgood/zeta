import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

export interface User {
  id: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/auth';

  user = signal<User | null>(null);
  loading = signal(true);

  constructor() {
    this.checkSession();
  }

  checkSession() {
    this.loading.set(true);
    this.http.get<User>(`${this.baseUrl}/me`).subscribe({
      next: (u) => {
        this.user.set(u);
        this.loading.set(false);
      },
      error: () => {
        this.user.set(null);
        this.loading.set(false);
      }
    });
  }

  login() {
    window.location.href = `${this.baseUrl}/login`;
  }

  logout() {
    this.http.post<{ logoutUrl: string }>(`${this.baseUrl}/logout`, {}).subscribe({
      next: (res) => {
        this.user.set(null);
        if (res.logoutUrl) {
          window.location.href = res.logoutUrl;
        } else {
          window.location.reload(); 
        }
      },
      error: () => {
        this.user.set(null);
        window.location.reload();
      }
    });
  }
}
