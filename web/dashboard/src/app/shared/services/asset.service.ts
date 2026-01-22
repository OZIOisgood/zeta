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

@Injectable({
  providedIn: 'root',
})
export class AssetService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/assets`;

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
