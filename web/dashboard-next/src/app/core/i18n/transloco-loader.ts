import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string): Observable<Translation> {
    // The version query invalidates locale JSON cached before translation assets
    // were configured for revalidation. Nginx now prevents future stale locales.
    return this.http.get<Translation>(`/i18n/${lang}.json?v=2`);
  }
}
