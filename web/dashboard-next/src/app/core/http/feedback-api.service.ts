import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type CreateFeedbackRequest = {
  rating: number;
  message: string;
  page_url: string;
};

export type CreateFeedbackResponse = {
  id: string;
  discord_status: 'posted' | 'failed' | 'skipped';
};

@Injectable({ providedIn: 'root' })
export class FeedbackApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  private get apiUrl(): string {
    return `${this.env.apiUrl}/feedback`;
  }

  create(data: CreateFeedbackRequest): Observable<CreateFeedbackResponse> {
    return this.http.post<CreateFeedbackResponse>(this.apiUrl, data);
  }
}
