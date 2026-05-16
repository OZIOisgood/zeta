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
              home: {
                kicker: 'Today',
                title: 'Coach videos, groups, and live sessions from one focused workspace.',
                summary: 'Review submitted videos and prepare upcoming sessions.',
                primaryAction: 'Upload video',
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
    expect(compiled.querySelector('h1')?.textContent).toContain('Coach videos');
    expect(compiled.textContent).toContain('Zeta');
  });
});
