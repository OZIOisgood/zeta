import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              app: { brand: 'Zeta', tagline: 'Video coaching workspace' },
              common: {
                closeNavigation: 'Close navigation',
                dismiss: 'Dismiss',
                language: 'Language',
                notifications: 'Notifications',
                openNavigation: 'Open navigation',
                preferences: 'Preferences',
                search: 'Search',
              },
              home: {
                badge: 'Workspace preview',
                kicker: 'Today',
                title: 'Coach videos, groups, and live sessions from one focused workspace.',
                summary: 'Review submitted videos and prepare upcoming sessions.',
                primaryAction: 'Upload video',
                empty: {
                  title: 'No urgent messages',
                  description: 'Conversation and review alerts will land here.',
                  action: 'View inbox',
                },
                error: {
                  badge: 'Fallback state',
                  title: 'Review data is unavailable',
                  description:
                    'If a product endpoint fails later, this compact state keeps the page useful.',
                },
                nextWork: {
                  title: 'Next work',
                  summary: 'A compact queue for reviews, sessions, and group actions.',
                },
                upload: {
                  title: 'New student video',
                  summary: 'Capture the context experts need before a review begins.',
                },
                skeleton: { title: 'Recent activity' },
              },
              toast: {
                title: 'Brand direction saved',
                message: 'The first logo mark is noted as the preferred candidate for review.',
              },
              user: {
                initials: 'ZT',
                name: 'Zeta Team',
                role: 'Product workspace',
              },
            },
          },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
          },
          preloadLangs: true,
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the Zeta dashboard shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Home');
    expect(compiled.querySelector('h2')?.textContent).toContain('Coach videos');
    expect(compiled.textContent).toContain('Zeta');
  });

  it('should open mobile navigation from the header control', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const openButton = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Open navigation"]',
    );

    openButton?.click();
    fixture.detectChanges();

    expect(compiled.querySelector('aside[aria-label="Mobile navigation"]')).toBeTruthy();
  });
});
