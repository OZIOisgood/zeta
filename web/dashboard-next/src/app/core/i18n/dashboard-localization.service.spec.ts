import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { DashboardLocalizationService } from './dashboard-localization.service';

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
});
