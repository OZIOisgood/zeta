import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type AdminEmailInbox = 'support' | 'social' | 'dsa';
export type AdminEmailHandlingStatus = 'open' | 'replied' | 'closed';
export type AdminEmailDeliveryStatus = 'pending' | 'sent' | 'failed';

export type AdminEmailAttachment = {
  id: string;
  filename: string;
  content_type: string;
  content_disposition?: string;
  content_id?: string;
  size?: number;
};

export type AdminEmailSummary = {
  id: string;
  inbox: AdminEmailInbox;
  inbox_address: string;
  sender: string;
  sender_name: string;
  subject: string;
  preview: string;
  received_at: string;
  handling_status: AdminEmailHandlingStatus;
  read_at?: string;
  attachment_count: number;
};

export type AdminEmailReply = {
  id: string;
  from_address: string;
  to_address: string;
  subject: string;
  body_text: string;
  sender_user_id: string;
  sender_display_name: string;
  delivery_status: AdminEmailDeliveryStatus;
  delivery_error?: string;
  sent_at?: string;
  created_at: string;
};

export type AdminEmailDetail = AdminEmailSummary & {
  recipients: string[];
  cc: string[];
  body_text: string;
  attachments: AdminEmailAttachment[];
  replies: AdminEmailReply[];
};

export type AdminEmailListResponse = {
  items: AdminEmailSummary[];
  total: number;
};

export type AdminEmailListParams = {
  inbox?: AdminEmailInbox | '';
  status?: AdminEmailHandlingStatus | '';
};

@Injectable({ providedIn: 'root' })
export class AdminEmailApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  private get apiUrl(): string {
    return `${this.env.apiUrl}/admin/emails`;
  }

  list(filters: AdminEmailListParams = {}): Observable<AdminEmailListResponse> {
    let params = new HttpParams();
    if (filters.inbox) params = params.set('inbox', filters.inbox);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<AdminEmailListResponse>(this.apiUrl, { params });
  }

  get(id: string): Observable<AdminEmailDetail> {
    return this.http.get<AdminEmailDetail>(`${this.apiUrl}/${id}`);
  }

  update(
    id: string,
    update: { status?: AdminEmailHandlingStatus; mark_read?: boolean },
  ): Observable<AdminEmailSummary> {
    return this.http.patch<AdminEmailSummary>(`${this.apiUrl}/${id}`, update);
  }

  reply(id: string, body: string, idempotencyKey: string): Observable<AdminEmailReply> {
    return this.http.post<AdminEmailReply>(`${this.apiUrl}/${id}/replies`, {
      body,
      idempotency_key: idempotencyKey,
    });
  }

  attachmentUrl(emailId: string, attachmentId: string): string {
    return `${this.apiUrl}/${emailId}/attachments/${encodeURIComponent(attachmentId)}`;
  }
}
