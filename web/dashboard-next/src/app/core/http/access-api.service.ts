import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type RedeemResponse = {
  access_status: string;
  role: string;
  role_upgraded: boolean;
};

export type SignupCode = {
  code: string;
  status: string;
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

  listCodes(): Observable<{ codes: SignupCode[] }> {
    return this.http.get<{ codes: SignupCode[] }>(`${this.baseUrl}/codes`);
  }

  generateCodes(count: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/codes`, { count });
  }
}
