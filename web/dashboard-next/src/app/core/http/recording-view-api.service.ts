import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ParticipantPresentation } from '../calls/coaching-call.types';
import { EnvService } from './env.service';

export type RecordingViewCredentials = {
  attempt_id: string;
  app_id: string;
  channel: string;
  token: string;
  uid: number;
  token_expires_at: string;
  scheduled_at: string;
  scheduled_ends_at: string;
  student: ParticipantPresentation;
  expert: ParticipantPresentation;
};

@Injectable({ providedIn: 'root' })
export class RecordingViewApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  exchange(capability: string): Observable<RecordingViewCredentials> {
    return this.http.post<RecordingViewCredentials>(
      `${this.env.apiUrl}/public/coaching/recording-renderer/exchange`,
      { capability },
    );
  }
}
