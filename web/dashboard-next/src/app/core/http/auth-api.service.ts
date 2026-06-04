import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type EmailPreferences = {
  notifications_enabled: boolean;
  asset_uploads_enabled: boolean;
  asset_reviews_enabled: boolean;
  invitation_updates_enabled: boolean;
  group_membership_updates_enabled: boolean;
  coaching_booking_updates_enabled: boolean;
  coaching_reminders_enabled: boolean;
};

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  language: string;
  avatar: string;
  timezone: string;
  email_preferences: EmailPreferences;
  role: string;
  permissions: string[];
};

export type UpdateUserRequest = {
  first_name: string;
  last_name: string;
  language: string;
  timezone: string;
  email_preferences: EmailPreferences;
  avatar?: string;
};

@Injectable({ providedIn: 'root' })
export class AuthApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  private get apiUrl(): string {
    return `${this.env.apiUrl}/auth`;
  }

  getLoginUrl(): string {
    return `${this.apiUrl}/login`;
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`);
  }

  logout(): Observable<{ logoutUrl: string }> {
    return this.http.post<{ logoutUrl: string }>(`${this.apiUrl}/logout`, {});
  }

  updateCurrentUser(data: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/me`, data);
  }
}
