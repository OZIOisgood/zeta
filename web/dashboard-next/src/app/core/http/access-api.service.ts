import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type RedeemResponse = {
  access_status: string;
  role: string;
  role_upgraded: boolean;
  group?: AccessGroup;
};

export type AccessGroup = { id: string; name: string; avatar?: string };

export type SignupCode = {
  id: string;
  code: string;
  status: 'available' | 'consumed';
  consumed_at?: string;
};

export type SignupCodesResponse = {
  codes: SignupCode[];
  successful_referrals: number;
  referral_limit: number;
  remaining_referrals: number;
};

export type GroupInvitationPreview = {
  code: string;
  group: AccessGroup;
  already_member: boolean;
};

@Injectable({ providedIn: 'root' })
export class AccessApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  private get baseUrl(): string {
    return `${this.env.apiUrl}/access`;
  }

  redeem(code: string): Observable<RedeemResponse> {
    return this.http.post<RedeemResponse>(`${this.baseUrl}/redeem`, { code });
  }

  previewGroupInvitation(code: string): Observable<GroupInvitationPreview> {
    return this.http.get<GroupInvitationPreview>(
      `${this.baseUrl}/group-invitations/${encodeURIComponent(code)}`,
    );
  }

  listCodes(): Observable<SignupCodesResponse> {
    return this.http.get<SignupCodesResponse>(`${this.baseUrl}/codes`);
  }
}
