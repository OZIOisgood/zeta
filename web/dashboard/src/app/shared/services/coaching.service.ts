import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export interface CoachingSession {
  id: string;
  title: string;
  description: string;
  group_id: string;
  group_name: string;
  student_id: string;
  expert_id: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_at: string;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCoachingSession {
  title: string;
  description: string;
  group_id: string;
  scheduled_at: string;
  duration_minutes: number;
}

export interface UpdateCoachingSession {
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
}

export interface CoachingConnectData {
  app_id: string;
  channel: string;
  token: string;
  uid: number;
}

@Injectable({
  providedIn: 'root',
})
export class CoachingService {
  private http = inject(HttpClient);
  private env = inject(EnvService);
  private get apiUrl() {
    return `${this.env.apiUrl}/coaching/sessions`;
  }

  getSessions(): Observable<CoachingSession[]> {
    return this.http.get<CoachingSession[]>(this.apiUrl);
  }

  getSession(id: string): Observable<CoachingSession> {
    return this.http.get<CoachingSession>(`${this.apiUrl}/${id}`);
  }

  createSession(data: CreateCoachingSession): Observable<CoachingSession> {
    return this.http.post<CoachingSession>(this.apiUrl, data);
  }

  updateSession(id: string, data: UpdateCoachingSession): Observable<CoachingSession> {
    return this.http.put<CoachingSession>(`${this.apiUrl}/${id}`, data);
  }

  cancelSession(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/cancel`, {});
  }

  getConnectData(id: string): Observable<CoachingConnectData> {
    return this.http.get<CoachingConnectData>(`${this.apiUrl}/${id}/connect`);
  }
}
