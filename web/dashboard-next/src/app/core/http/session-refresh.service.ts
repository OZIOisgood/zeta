import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, finalize, shareReplay } from 'rxjs';
import { EnvService } from './env.service';

@Injectable({ providedIn: 'root' })
export class SessionRefreshService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly env = inject(EnvService);
  private inFlight: Observable<void> | null = null;

  refresh(): Observable<void> {
    if (!this.inFlight) {
      this.inFlight = this.http
        .post<void>(`${this.env.apiUrl}/auth/refresh`, null, { withCredentials: true })
        .pipe(
          finalize(() => {
            this.inFlight = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.inFlight;
  }
}
