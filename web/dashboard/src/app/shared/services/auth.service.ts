import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

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
      },
    });
  }

  login() {
    window.location.href = `${this.baseUrl}/login`;
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
