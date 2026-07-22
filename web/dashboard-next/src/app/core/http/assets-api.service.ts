import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type VideoResponse = {
  id: string;
  upload_url: string;
  filename: string;
};

export type CreateAssetResponse = {
  asset_id: string;
  videos: VideoResponse[];
};

export type AssetStatus = 'waiting_upload' | 'pending' | 'completed';

export type VideoItem = {
  id: string;
  playback_id: string;
  status: string;
  review_count: number;
};

export type AssetGroup = {
  id: string;
  name: string;
  avatar?: string;
};

export type AssetStudent = {
  id: string;
  name: string;
  avatar?: string;
};

// Product copy calls this a video, but the backend/API parent entity remains an asset.
export type Asset = {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  status: AssetStatus;
  review_count: number;
  thumbnail?: string;
  playback_id?: string;
  videos?: VideoItem[];
  group?: AssetGroup;
  student?: AssetStudent;
};

export type ReviewAuthor = {
  id?: string;
  name: string;
  avatar?: string;
};

export type Review = {
  id: string;
  content: string;
  timestamp_seconds?: number;
  parent_id?: string | null;
  author?: ReviewAuthor;
  created_at: string;
};

@Injectable({ providedIn: 'root' })
export class AssetsApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  private get apiUrl(): string {
    return `${this.env.apiUrl}/assets`;
  }

  listAssets(): Observable<Asset[]> {
    return this.http.get<Asset[]>(this.apiUrl);
  }

  getAsset(id: string): Observable<Asset> {
    return this.http.get<Asset>(`${this.apiUrl}/${id}`);
  }

  createAsset(data: {
    title: string;
    description: string;
    filenames: string[];
    group_id?: string;
  }): Observable<CreateAssetResponse> {
    return this.http.post<CreateAssetResponse>(this.apiUrl, data);
  }

  completeUpload(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/complete`, {});
  }

  listReviews(videoId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/videos/${videoId}/reviews`);
  }

  createReview(
    videoId: string,
    content: string,
    timestampSeconds?: number,
    parentId?: string,
  ): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/videos/${videoId}/reviews`, {
      content,
      ...(timestampSeconds === undefined ? {} : { timestamp_seconds: timestampSeconds }),
      ...(parentId === undefined ? {} : { parent_id: parentId }),
    });
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
    return this.http.post<{ enhanced_text: string }>(`${this.env.apiUrl}/reviews/enhance`, {
      text,
    });
  }

  finalizeAsset(assetId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${assetId}/finalize`, {});
  }
}
