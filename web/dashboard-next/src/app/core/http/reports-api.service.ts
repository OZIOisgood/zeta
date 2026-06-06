import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type ReportRole = 'expert' | 'student';

export type ReportRef = {
  id: string;
  name: string;
};

// One report event: a video upload or a live coaching. Both carry the group,
// the student and the expert so the client can nest under either leaf.
// duration_seconds unifies video length and (session minutes × 60).
export type ReportEvent = {
  kind: 'video' | 'live';
  group: ReportRef;
  student: ReportRef;
  expert: ReportRef;
  title: string;
  at: string;
  duration_seconds: number;
};

export type ReportEventsResponse = {
  role: ReportRole;
  viewer: ReportRef;
  events: ReportEvent[];
};

@Injectable({ providedIn: 'root' })
export class ReportsApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  events(): Observable<ReportEventsResponse> {
    return this.http.get<ReportEventsResponse>(`${this.env.apiUrl}/reports/events`);
  }
}
