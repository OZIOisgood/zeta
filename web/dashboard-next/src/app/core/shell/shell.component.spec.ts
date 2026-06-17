import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideExitAnimationManager } from 'ng-primitives/internal';
import { of } from 'rxjs';
import { AuthApiClient, User } from '../http/auth-api.service';
import { FeedbackApiClient } from '../http/feedback-api.service';
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
    app: { brand: 'Strido', tagline: 'Video coaching' },
    auth: { logout: 'Sign out' },
    common: {
      closeNavigation: 'Close navigation',
      dismiss: 'Dismiss',
      language: 'Language',
      notifications: 'Notifications',
      openNavigation: 'Open navigation',
      preferences: 'Preferences',
      search: 'Search',
      actions: { cancel: 'Cancel', signOut: 'Sign out' },
      legal: {
        contact: 'Contact',
        imprint: 'Imprint',
        menu: 'Help',
        privacy: 'Privacy',
        terms: 'Terms of Use',
      },
      nav: { groups: 'Groups', home: 'Home', sessions: 'Sessions', videos: 'Videos' },
    },
    feedback: {
      button: 'Feedback',
      open: 'Open feedback form',
      dialog: {
        title: 'Share feedback',
        description: 'Tell us what worked.',
      },
      rating: {
        label: 'How was your experience?',
        option: '{{rating}} out of 5',
      },
      message: {
        label: 'Feedback',
        placeholder: 'Write a short note...',
      },
      actions: {
        send: 'Send feedback',
      },
      toast: {
        successTitle: 'Feedback sent',
        successMessage: 'Thanks. We will take a look.',
        errorTitle: 'Could not send feedback',
        errorMessage: 'Please try again.',
      },
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
  let feedbackApi: Pick<FeedbackApiClient, 'create'>;
  let createFeedback: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    if (!HTMLElement.prototype.getAnimations) {
      Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
        configurable: true,
        value: () => [],
      });
    }

    createFeedback = vi.fn(() => of({ id: 'feedback-1', discord_status: 'posted' }));
    feedbackApi = { create: createFeedback as FeedbackApiClient['create'] };

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
          provide: FeedbackApiClient,
          useValue: feedbackApi,
        },
        provideExitAnimationManager(),
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
    expect(el.querySelector('img[alt="Strido"]')).toBeTruthy();
  });

  it('prepares localized legal links for the sidebar menu', async () => {
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const legalButton = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Help'),
    );
    const links = (
      fixture.componentInstance as unknown as {
        legalLinks: () => { label: string; href: string }[];
      }
    ).legalLinks();

    expect(legalButton).toBeTruthy();
    expect(links.map((link) => link.label)).toEqual([
      'Imprint',
      'Privacy',
      'Terms of Use',
      'Contact',
    ]);
    expect(links.map((link) => link.href)).toEqual([
      'https://strido.net/en/imprint.html',
      'https://strido.net/en/privacy.html',
      'https://strido.net/en/terms.html',
      'https://strido.net/en/contact.html',
    ]);
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

    expect(menuButton?.querySelector('z-avatar')?.classList).toContain('size-9');
    expect(menuButton?.getAttribute('aria-expanded')).toBe('true');
    expect(el.textContent).toContain('ada@example.com');
    expect(el.querySelector('.absolute .border-b z-avatar')?.classList).toContain('size-10');
    expect(el.textContent).not.toContain('Language');

    document.body.click();
    fixture.detectChanges();

    expect(el.textContent).not.toContain('ada@example.com');
  });

  it('opens and submits feedback', async () => {
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('button[aria-label="Open feedback form"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.body.textContent).toContain('Share feedback');

    document.body.querySelector<HTMLButtonElement>('button[aria-label="4 out of 5"]')?.click();
    const textarea = document.body.querySelector<HTMLTextAreaElement>(
      'textarea[placeholder="Write a short note..."]',
    );
    expect(textarea).toBeTruthy();
    textarea!.value = 'The upload page feels clear.';
    textarea!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const sendButton = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Send feedback'),
    );
    sendButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(createFeedback).toHaveBeenCalledWith({
      rating: 4,
      message: 'The upload page feels clear.',
      page_url: expect.any(String),
    });
    expect(el.textContent).toContain('Feedback sent');
  });
});
