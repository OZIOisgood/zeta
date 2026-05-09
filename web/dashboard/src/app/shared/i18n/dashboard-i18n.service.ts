import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';

export const DASHBOARD_LANGUAGES = [
  { code: 'en', nameKey: 'preferences.languages.en' },
  { code: 'de', nameKey: 'preferences.languages.de' },
  { code: 'fr', nameKey: 'preferences.languages.fr' },
] as const;

export type DashboardLanguage = (typeof DASHBOARD_LANGUAGES)[number]['code'];

const DEFAULT_LANGUAGE: DashboardLanguage = 'en';
const SUPPORTED_LANGUAGES = new Set<string>(DASHBOARD_LANGUAGES.map((language) => language.code));

@Injectable({ providedIn: 'root' })
export class DashboardI18nService {
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.translate.addLangs(DASHBOARD_LANGUAGES.map((language) => language.code));
    this.translate.setFallbackLang(DEFAULT_LANGUAGE);
    this.useLanguage(this.resolveBrowserLanguage());

    effect(() => {
      const userLanguage = this.auth.user()?.language;

      if (userLanguage) {
        this.useLanguage(userLanguage);
      }
    });
  }

  instant(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  currentLanguage(): DashboardLanguage {
    return this.normalizeLanguage(this.translate.currentLang);
  }

  private useLanguage(language: string | null | undefined): void {
    const normalized = this.normalizeLanguage(language);

    this.translate.use(normalized);
    this.document.documentElement.lang = normalized;
  }

  private resolveBrowserLanguage(): DashboardLanguage {
    if (typeof navigator === 'undefined') {
      return DEFAULT_LANGUAGE;
    }

    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];

    for (const language of languages) {
      const normalized = this.normalizeLanguage(language);
      if (normalized !== DEFAULT_LANGUAGE || this.isEnglish(language)) {
        return normalized;
      }
    }

    return DEFAULT_LANGUAGE;
  }

  private normalizeLanguage(language: string | null | undefined): DashboardLanguage {
    const code = language?.toLowerCase().split('-')[0] ?? DEFAULT_LANGUAGE;

    return SUPPORTED_LANGUAGES.has(code) ? (code as DashboardLanguage) : DEFAULT_LANGUAGE;
  }

  private isEnglish(language: string | null | undefined): boolean {
    return language?.toLowerCase().split('-')[0] === DEFAULT_LANGUAGE;
  }
}
