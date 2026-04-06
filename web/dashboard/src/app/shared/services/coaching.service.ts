import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export interface CoachingAvailability {
  id: string;
  expert_id: string;
  group_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface CoachingBlockedSlot {
  id: string;
  expert_id: string;
  blocked_date: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  created_at: string;
}

export interface CoachingSlot {
  expert_id: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
}

export interface CoachingBooking {
  id: string;
  expert_id: string;
  expert_name: string;
  student_id: string;
  student_name: string;
  group_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  cancellation_reason?: string;
  cancelled_by?: string;
  notes?: string;
  created_at: string;
}

export interface ExpertInfo {
  expert_id: string;
  first_name: string;
  last_name: string;
  avatar?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CoachingService {
  private http = inject(HttpClient);
  private env = inject(EnvService);
  private get apiUrl() {
    return this.env.apiUrl;
  }

  // Timezone
  getMyTimezone(): Observable<{ timezone: string }> {
    return this.http.get<{ timezone: string }>(`${this.apiUrl}/coaching/timezone`);
  }

  setMyTimezone(timezone: string): Observable<{ timezone: string }> {
    return this.http.put<{ timezone: string }>(`${this.apiUrl}/coaching/timezone`, { timezone });
  }

  // Availability
  listMyAvailability(groupId: string): Observable<CoachingAvailability[]> {
    return this.http.get<CoachingAvailability[]>(
      `${this.apiUrl}/groups/${groupId}/coaching/availability`,
    );
  }

  createAvailability(
    groupId: string,
    data: {
      day_of_week: number;
      start_time: string;
      end_time: string;
      slot_duration_minutes: number;
    },
  ): Observable<CoachingAvailability> {
    return this.http.post<CoachingAvailability>(
      `${this.apiUrl}/groups/${groupId}/coaching/availability`,
      data,
    );
  }

  updateAvailability(
    groupId: string,
    availabilityId: string,
    data: {
      day_of_week: number;
      start_time: string;
      end_time: string;
      slot_duration_minutes: number;
    },
  ): Observable<CoachingAvailability> {
    return this.http.put<CoachingAvailability>(
      `${this.apiUrl}/groups/${groupId}/coaching/availability/${availabilityId}`,
      data,
    );
  }

  deleteAvailability(groupId: string, availabilityId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/groups/${groupId}/coaching/availability/${availabilityId}`,
    );
  }

  // Blocked slots
  listBlockedSlots(groupId: string): Observable<CoachingBlockedSlot[]> {
    return this.http.get<CoachingBlockedSlot[]>(
      `${this.apiUrl}/groups/${groupId}/coaching/blocked-slots`,
    );
  }

  createBlockedSlot(
    groupId: string,
    data: { blocked_date: string; start_time?: string; end_time?: string; reason?: string },
  ): Observable<CoachingBlockedSlot> {
    return this.http.post<CoachingBlockedSlot>(
      `${this.apiUrl}/groups/${groupId}/coaching/blocked-slots`,
      data,
    );
  }

  deleteBlockedSlot(groupId: string, slotId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/groups/${groupId}/coaching/blocked-slots/${slotId}`,
    );
  }

  // Experts
  listExperts(groupId: string): Observable<ExpertInfo[]> {
    return this.http.get<ExpertInfo[]>(`${this.apiUrl}/groups/${groupId}/coaching/experts`);
  }

  // Slots
  listAvailableSlots(groupId: string, expertId: string): Observable<CoachingSlot[]> {
    return this.http.get<CoachingSlot[]>(
      `${this.apiUrl}/groups/${groupId}/coaching/slots?expert_id=${expertId}`,
    );
  }

  // Bookings
  createBooking(
    groupId: string,
    data: {
      expert_id: string;
      scheduled_at: string;
      duration_minutes: number;
      notes?: string;
    },
  ): Observable<CoachingBooking> {
    return this.http.post<CoachingBooking>(
      `${this.apiUrl}/groups/${groupId}/coaching/bookings`,
      data,
    );
  }

  listMyBookings(): Observable<CoachingBooking[]> {
    return this.http.get<CoachingBooking[]>(`${this.apiUrl}/coaching/bookings`);
  }

  listGroupSessions(groupId: string): Observable<CoachingBooking[]> {
    return this.http.get<CoachingBooking[]>(`${this.apiUrl}/groups/${groupId}/coaching/sessions`);
  }

  cancelBooking(bookingId: string, reason?: string): Observable<CoachingBooking> {
    return this.http.put<CoachingBooking>(`${this.apiUrl}/coaching/bookings/${bookingId}/status`, {
      status: 'cancelled',
      cancellation_reason: reason,
    });
  }

  completeBooking(bookingId: string): Observable<CoachingBooking> {
    return this.http.put<CoachingBooking>(`${this.apiUrl}/coaching/bookings/${bookingId}/status`, {
      status: 'completed',
    });
  }
}
