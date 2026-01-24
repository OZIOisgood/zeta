import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs';

export type Feature = 'groups' | 'upload-video';

@Injectable({
  providedIn: 'root',
})
export class FeatureService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/features';

  features = signal<Feature[]>([]);

  loadFeatures() {
    return this.http
      .get<Feature[]>(this.baseUrl)
      .pipe(tap((features) => this.features.set(features)));
  }

  hasFeature(feature: Feature): boolean {
    return this.features().includes(feature);
  }
}
