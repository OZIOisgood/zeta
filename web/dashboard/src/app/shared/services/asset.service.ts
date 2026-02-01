import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VideoResponse {
  id: string;
  upload_url: string;
  filename: string;
}

export interface CreateAssetResponse {
  asset_id: string;
  videos: VideoResponse[];
}

export type AssetStatus = 'waiting_upload' | 'pending' | 'completed';

export interface VideoItem {
  id: string;
  playback_id: string;
  status: string;
  review_count: number;
}

export interface Asset {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  status: AssetStatus;
  thumbnail?: string;
  playback_id?: string;
  videos?: VideoItem[];
}

export interface Review {
  id: string;
  content: string;
  timestamp_seconds?: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class AssetService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/assets`;

  getAssets(): Observable<Asset[]> {
    return this.http.get<Asset[]>(this.apiUrl);
  }

  getAsset(id: string): Observable<Asset> {
    return this.http.get<Asset>(`${this.apiUrl}/${id}`);
  }

  createAsset(
    title: string,
    description: string,
    filenames: string[],
    group_id?: string,
  ): Observable<CreateAssetResponse> {
    return this.http.post<CreateAssetResponse>(this.apiUrl, {
      title,
      description,
      filenames,
      group_id,
    });
  }

  completeUpload(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/complete`, {});
  }

  getReviews(videoId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/videos/${videoId}/reviews`);
  }

  createReview(videoId: string, content: string, timestampSeconds?: number): Observable<Review> {
    const body: { content: string; timestamp_seconds?: number } = { content };
    if (timestampSeconds !== undefined) {
      body.timestamp_seconds = timestampSeconds;
    }
    return this.http.post<Review>(`${this.apiUrl}/videos/${videoId}/reviews`, body);
  }

  updateReview(videoId: string, reviewId: string, content: string): Observable<Review> {
    return this.http.put<Review>(`${this.apiUrl}/videos/${videoId}/reviews/${reviewId}`, {
      content,
    });
  }

  deleteReview(videoId: string, reviewId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/videos/${videoId}/reviews/${reviewId}`);
  }

  enhanceReviewText(text: string): Observable<{ enhanced_text: string }> {
    return this.http.post<{ enhanced_text: string }>(`${environment.apiUrl}/reviews/enhance`, {
      text,
    });
  }

  finalizeVideo(assetId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${assetId}/finalize`, {});
  }
}
