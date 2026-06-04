import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { AuthApiClient, User } from '../http/auth-api.service';
import { DashboardLocalizationService } from '../i18n/dashboard-localization.service';
import { ShellComponent } from './shell.component';

const mockUser: User = {
  id: 'u1',
  email: 'ada@example.com',
  first_name: 'Ada',
  last_name: 'Coach',
  language: 'en',
  avatar: '',
  timezone: 'Europe/Berlin',
  role: 'expert',
  permissions: [],
  email_preferences: {
    notifications_enabled: true,
    asset_uploads_enabled: true,
    asset_reviews_enabled: true,
    invitation_updates_enabled: true,
    group_membership_updates_enabled: true,
    coaching_booking_updates_enabled: true,
    coaching_reminders_enabled: true,
  },
};

const translocoLangs = {
  en: {
    app: { brand: 'Zeta', tagline: 'Video coaching' },
    auth: { logout: 'Sign out' },
    common: {
      closeNavigation: 'Close navigation',
      dismiss: 'Dismiss',
      language: 'Language',
      notifications: 'Notifications',
      openNavigation: 'Open navigation',
      preferences: 'Preferences',
      search: 'Search',
      nav: { groups: 'Groups', home: 'Home', sessions: 'Sessions', videos: 'Videos' },
    },
    home: {
      kicker: 'Today',
      kicker_en: 'Today',
    },
    toast: { title: '', message: '' },
    user: { initials: 'AC', name: 'Ada Coach', role: 'expert' },
  },
};

describe('ShellComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ShellComponent,
        TranslocoTestingModule.forRoot({
          langs: translocoLangs,
          translocoConfig: {
            availableLangs: ['en', 'de', 'fr'],
            defaultLang: 'en',
            fallbackLang: 'en',
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: AuthApiClient,
          useValue: { getCurrentUser: () => of(mockUser), logout: () => of({ logoutUrl: '' }) },
        },
        {
          provide: DashboardLocalizationService,
          useValue: {
            currentLanguage: () => 'en',
            useLanguage: () => {},
            useUserPreferences: () => {},
            isSupportedLanguage: () => true,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the shell', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the primary navigation and brand', async () => {
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('aside[aria-label="Primary navigation"]')).toBeTruthy();
    expect(el.textContent).toContain('Zeta');
  });

  it('should open mobile navigation from the header control', async () => {
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const openButton = el.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');
    openButton?.click();
    fixture.detectChanges();

    expect(el.querySelector('aside[aria-label="Mobile navigation"]')).toBeTruthy();
  });

  it('should close the user menu when clicking outside', async () => {
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const menuButton = el.querySelector<HTMLButtonElement>('button[aria-label="Ada Coach"]');

    menuButton?.click();
    fixture.detectChanges();

    expect(menuButton?.querySelector('z-avatar')?.classList).toContain('size-8');
    expect(menuButton?.getAttribute('aria-expanded')).toBe('true');
    expect(el.textContent).toContain('ada@example.com');
    expect(el.querySelector('.absolute .border-b z-avatar')?.classList).toContain('size-10');
    expect(el.textContent).not.toContain('Language');

    document.body.click();
    fixture.detectChanges();

    expect(el.textContent).not.toContain('ada@example.com');
  });
});
