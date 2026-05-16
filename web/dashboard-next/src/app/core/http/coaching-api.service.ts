import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type SessionType = {
  id: string;
  expert_id: string;
  group_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CoachingAvailability = {
  id: string;
  expert_id: string;
  group_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
};

export type CoachingBlockedSlot = {
  id: string;
  expert_id: string;
  blocked_date: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  created_at: string;
};

export type CoachingSlot = {
  expert_id: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
};

export type CoachingBookingStatus = 'pending' | 'done' | 'cancelled';

export type CoachingBookingRecording = {
  status:
    | 'starting'
    | 'started'
    | 'stopping'
    | 'stopped'
    | 'pending'
    | 'importing'
    | 'processing'
    | 'ready'
    | 'failed';
  asset_id?: string;
  video_id?: string;
};

export type CoachingBooking = {
  id: string;
  expert_id: string;
  expert_name: string;
  student_id: string;
  student_name: string;
  group_id: string;
  session_type_id: string;
  session_type_name?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: CoachingBookingStatus;
  cancellation_reason?: string;
  cancelled_by?: string;
  notes?: string;
  recording?: CoachingBookingRecording;
  created_at: string;
};

export type ExpertInfo = {
  expert_id: string;
  first_name: string;
  last_name: string;
  avatar?: string;
};

export type ConnectResponse = {
  app_id: string;
  channel: string;
  token: string;
  uid: number;
};

@Injectable({ providedIn: 'root' })
export class CoachingApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  private get apiUrl(): string {
    return this.env.apiUrl;
  }

  listSessionTypes(groupId: string): Observable<SessionType[]> {
    return this.http.get<SessionType[]>(`${this.apiUrl}/groups/${groupId}/coaching/session-types`);
  }

  listExperts(groupId: string): Observable<ExpertInfo[]> {
    return this.http.get<ExpertInfo[]>(`${this.apiUrl}/groups/${groupId}/coaching/experts`);
  }

  listAvailableSlots(
    groupId: string,
    expertId: string,
    sessionTypeId: string,
  ): Observable<CoachingSlot[]> {
    const params = new HttpParams()
      .set('expert_id', expertId)
      .set('session_type_id', sessionTypeId);

    return this.http.get<CoachingSlot[]>(`${this.apiUrl}/groups/${groupId}/coaching/slots`, {
      params,
    });
  }

  listAllMyBookings(): Observable<CoachingBooking[]> {
    return this.http.get<CoachingBooking[]>(`${this.apiUrl}/coaching/bookings`);
  }

  listMyBookings(groupId: string): Observable<CoachingBooking[]> {
    return this.http.get<CoachingBooking[]>(`${this.apiUrl}/groups/${groupId}/coaching/bookings`);
  }

  createBooking(
    groupId: string,
    data: {
      expert_id: string;
      session_type_id: string;
      scheduled_at: string;
      notes?: string;
    },
  ): Observable<CoachingBooking> {
    return this.http.post<CoachingBooking>(
      `${this.apiUrl}/groups/${groupId}/coaching/bookings`,
      data,
    );
  }

  cancelBooking(groupId: string, bookingId: string, reason?: string): Observable<CoachingBooking> {
    return this.http.put<CoachingBooking>(
      `${this.apiUrl}/groups/${groupId}/coaching/bookings/${bookingId}/cancel`,
      reason ? { cancellation_reason: reason } : {},
    );
  }

  connectToBooking(groupId: string, bookingId: string): Observable<ConnectResponse> {
    return this.http.get<ConnectResponse>(
      `${this.apiUrl}/groups/${groupId}/coaching/bookings/${bookingId}/connect`,
    );
  }
}
