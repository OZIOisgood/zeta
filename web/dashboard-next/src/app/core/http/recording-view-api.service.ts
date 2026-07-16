import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ParticipantPresentation } from '../calls/coaching-call.types';
import { EnvService } from './env.service';

export type RecordingViewCredentials = {
  app_id: string;
  channel: string;
  token: string;
  uid: number;
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
