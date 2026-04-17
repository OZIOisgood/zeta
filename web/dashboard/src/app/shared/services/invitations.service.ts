import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export interface InvitationInfo {
  code: string;
  group_name: string;
  group_avatar: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class InvitationsService {
  private http = inject(HttpClient);
  private env = inject(EnvService);
  private get apiUrl() {
    return `${this.env.apiUrl}/groups`;
  }

  create(groupId: string, email: string): Observable<{ id: string; code: string }> {
    return this.http.post<{ id: string; code: string }>(`${this.apiUrl}/${groupId}/invitations`, {
      email,
    });
  }

  getInfo(code: string): Observable<InvitationInfo> {
    return this.http.get<InvitationInfo>(`${this.apiUrl}/invitations/${code}`);
  }

  accept(code: string): Observable<{ group_id: string }> {
    return this.http.post<{ group_id: string }>(`${this.apiUrl}/invitations/accept`, { code });
  }

  getQrCode(groupId: string, invitationId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${groupId}/invitations/${invitationId}/qr`, {
      responseType: 'blob',
    });
  }
}
