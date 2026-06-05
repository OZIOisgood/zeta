import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type NotificationType =
  | 'group_invitation_received'
  | 'group_member_joined'
  | 'video_reviewed'
  | 'video_uploaded'
  | 'coaching_booking_created';

// Denormalized payload carried per notification. Fields present depend on the
// type; all optional so the client can render and deep-link defensively.
export type NotificationPayload = {
  group_id?: string;
  group_name?: string;
  inviter_name?: string;
  code?: string;
  member_name?: string;
  asset_id?: string;
  video_title?: string;
  reviewer_name?: string;
  uploader_name?: string;
  booking_id?: string;
  student_name?: string;
  session_name?: string;
  scheduled_at?: string;
};

// Client-only resolution state for invitation notifications, set after the user
// accepts/declines inline. Never sent by the API.
export type InviteState = 'accepted' | 'declined';

// Server-resolved status of the referenced invitation (group_invitation_received
// only). Lets the client hide accept/decline after the invite was resolved
// elsewhere or on reload. Absent for live SSE pushes (treated as actionable).
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  payload: NotificationPayload;
  read: boolean;
  created_at: string;
  invite_status?: InviteStatus;
  inviteState?: InviteState;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  unread_count: number;
};

@Injectable({ providedIn: 'root' })
export class NotificationsApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  private get apiUrl(): string {
    return `${this.env.apiUrl}/notifications`;
  }

  list(): Observable<NotificationListResponse> {
    return this.http.get<NotificationListResponse>(this.apiUrl);
  }

  markRead(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/read-all`, {});
  }

  /** URL for the SSE stream; consumed via EventSource (cookie auth). */
  streamUrl(): string {
    return `${this.apiUrl}/stream`;
  }
}
