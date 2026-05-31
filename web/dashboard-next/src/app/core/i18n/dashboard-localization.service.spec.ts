import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { DashboardLocalizationService, resolveDateLocale } from './dashboard-localization.service';

describe('DashboardLocalizationService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: { preferences: { languages: { en: 'English' } } },
            de: { preferences: { languages: { de: 'German' } } },
            fr: { preferences: { languages: { fr: 'French' } } },
          },
          translocoConfig: {
            availableLangs: ['en', 'de', 'fr'],
            defaultLang: 'en',
            fallbackLang: 'en',
          },
          preloadLangs: true,
        }),
      ],
    });
  });

  it('uses supported language codes and updates document language', () => {
    const service = TestBed.inject(DashboardLocalizationService);
    const document = TestBed.inject(DOCUMENT);

    const language = service.useLanguage('de-DE');

    expect(language).toBe('de');
    expect(service.currentLanguage()).toBe('de');
    expect(document.documentElement.lang).toBe('de');
  });

  it('falls back to English for unsupported languages', () => {
    const service = TestBed.inject(DashboardLocalizationService);

    expect(service.useLanguage('es')).toBe('en');
    expect(service.currentLanguage()).toBe('en');
  });

  it('uses regional date locales from language and timezone preferences', () => {
    expect(resolveDateLocale('en', 'Europe/Rome')).toBe('en-GB');
    expect(resolveDateLocale('en', 'America/New_York')).toBe('en-US');
    expect(resolveDateLocale('de', 'America/New_York')).toBe('de-DE');
    expect(resolveDateLocale('fr', 'Europe/Rome')).toBe('fr-FR');
  });

  it('tracks the user timezone for date formatting', () => {
    const service = TestBed.inject(DashboardLocalizationService);

    service.useUserPreferences('en', 'Europe/Rome');

    expect(service.currentLanguage()).toBe('en');
    expect(service.timeZone()).toBe('Europe/Rome');
    expect(service.dateLocale()).toBe('en-GB');
  });
});
