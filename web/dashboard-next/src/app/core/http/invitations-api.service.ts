import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type AcceptInvitationResponse = {
  group_id: string;
};

@Injectable({ providedIn: 'root' })
export class InvitationsApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  private get baseUrl(): string {
    return `${this.env.apiUrl}/groups/invitations`;
  }

  /** Accept a pending group invitation by its code; joins the group. */
  accept(code: string): Observable<AcceptInvitationResponse> {
    return this.http.post<AcceptInvitationResponse>(`${this.baseUrl}/accept`, { code });
  }

  /** Decline a pending group invitation by its code. */
  decline(code: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/decline`, { code });
  }
}
