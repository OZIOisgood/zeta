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

export type AssetStatus = 'pending' | 'completed';

export interface VideoItem {
  id: string;
  playback_id: string;
  status: string;
}

export interface Asset {
  id: string;
  title: string;
  description: string;
  status: AssetStatus;
  thumbnail?: string;
  playback_id?: string;
  videos?: VideoItem[];
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
  ): Observable<CreateAssetResponse> {
    return this.http.post<CreateAssetResponse>(this.apiUrl, {
      title,
      description,
      filenames,
    });
  }
}
