import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type ModerationReportSubjectType = 'review_comment' | 'user';
export type ModerationReportReason = 'harassment' | 'spam' | 'inappropriate_content' | 'other';
export type ModerationReportStatus = 'open' | 'resolved' | 'rejected';
export type ModerationDiscordStatus = 'pending' | 'posted' | 'failed' | 'skipped';

export type CreateModerationReportRequest = {
  subject_type: ModerationReportSubjectType;
  video_id: string;
  review_id: string;
  reason: ModerationReportReason;
  details: string;
  page_url: string;
};

export type ModerationReport = {
  id: string;
  reporter_user_id: string;
  reporter_display_name: string;
  subject_type: ModerationReportSubjectType;
  target_review_id?: string;
  target_video_id?: string;
  target_user_id?: string;
  target_display_name?: string;
  target_review_content: string;
  reason: ModerationReportReason;
  details: string;
  page_url: string;
  status: ModerationReportStatus;
  resolved_by_user_id?: string;
  resolved_at?: string;
  discord_status: ModerationDiscordStatus;
  discord_channel_id?: string;
  discord_thread_id?: string;
  discord_message_id?: string;
  discord_error?: string;
  created_at: string;
  updated_at: string;
};

export type ListModerationReportsParams = {
  status?: ModerationReportStatus | '';
  subject_type?: ModerationReportSubjectType | '';
};

@Injectable({ providedIn: 'root' })
export class ModerationReportsApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  private get apiUrl(): string {
    return `${this.env.apiUrl}/moderation/reports`;
  }

  create(data: CreateModerationReportRequest): Observable<ModerationReport> {
    return this.http.post<ModerationReport>(this.apiUrl, data);
  }

  list(filters: ListModerationReportsParams = {}): Observable<ModerationReport[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.subject_type) params = params.set('subject_type', filters.subject_type);
    return this.http.get<ModerationReport[]>(this.apiUrl, { params });
  }

  updateStatus(
    id: string,
    status: Exclude<ModerationReportStatus, 'open'>,
  ): Observable<ModerationReport> {
    return this.http.patch<ModerationReport>(`${this.apiUrl}/${id}`, {
      status,
    });
  }
}
