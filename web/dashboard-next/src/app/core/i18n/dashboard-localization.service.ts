import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export const DASHBOARD_LANGUAGES = [
  { value: 'en', label: 'EN', nameKey: 'preferences.languages.en' },
  { value: 'de', label: 'DE', nameKey: 'preferences.languages.de' },
  { value: 'fr', label: 'FR', nameKey: 'preferences.languages.fr' },
] as const;

export type DashboardLanguage = (typeof DASHBOARD_LANGUAGES)[number]['value'];

const DEFAULT_LANGUAGE: DashboardLanguage = 'en';
const SUPPORTED_LANGUAGES = new Set<string>(DASHBOARD_LANGUAGES.map((language) => language.value));

@Injectable({ providedIn: 'root' })
export class DashboardLocalizationService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.useLanguage(this.resolveBrowserLanguage());
  }

  currentLanguage(): DashboardLanguage {
    return this.normalizeLanguage(this.transloco.getActiveLang());
  }

  isSupportedLanguage(language: string): language is DashboardLanguage {
    return SUPPORTED_LANGUAGES.has(language);
  }

  resolveBrowserLanguage(): DashboardLanguage {
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

  useLanguage(language: string | null | undefined): DashboardLanguage {
    const normalized = this.normalizeLanguage(language);

    this.transloco.setActiveLang(normalized);
    this.document.documentElement.lang = normalized;

    return normalized;
  }

  private normalizeLanguage(language: string | null | undefined): DashboardLanguage {
    const code = language?.toLowerCase().split('-')[0] ?? DEFAULT_LANGUAGE;

    return SUPPORTED_LANGUAGES.has(code) ? (code as DashboardLanguage) : DEFAULT_LANGUAGE;
  }

  private isEnglish(language: string | null | undefined): boolean {
    return language?.toLowerCase().split('-')[0] === DEFAULT_LANGUAGE;
  }
}
