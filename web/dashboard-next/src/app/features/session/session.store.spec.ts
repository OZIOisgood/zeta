import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthApiClient, User } from '../../core/http/auth-api.service';
import { DashboardLocalizationService } from '../../core/i18n/dashboard-localization.service';
import { SessionStore } from './session.store';

const user: User = {
  id: 'user-1',
  email: 'coach@example.com',
  first_name: 'Ada',
  last_name: 'Coach',
  language: 'fr',
  avatar: '',
  timezone: 'Europe/Rome',
  role: 'expert',
  permissions: ['assets:create'],
  access_status: 'active',
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

describe('SessionStore', () => {
  it('loads the current user and applies the user language', async () => {
    const localization = {
      useUserPreferences: vi.fn(() => 'fr'),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthApiClient,
          useValue: {
            getCurrentUser: () => of(user),
          },
        },
        {
          provide: DashboardLocalizationService,
          useValue: localization,
        },
      ],
    });

    const store = TestBed.inject(SessionStore);

    await store.loadCurrentUser();

    expect(store.status()).toBe('success');
    expect(store.displayName()).toBe('Ada Coach');
    expect(store.hasPermission('assets:create')).toBe(true);
    expect(localization.useUserPreferences).toHaveBeenCalledWith('fr', 'Europe/Rome');
  });

  it('marks the session unauthenticated when user loading fails', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthApiClient,
          useValue: {
            getCurrentUser: () => throwError(() => new Error('Unauthorized')),
          },
        },
        {
          provide: DashboardLocalizationService,
          useValue: {
            useUserPreferences: vi.fn(),
          },
        },
      ],
    });

    const store = TestBed.inject(SessionStore);

    await store.loadCurrentUser();

    expect(store.status()).toBe('error');
    expect(store.unauthenticated()).toBe(true);
    expect(store.user()).toBeNull();
  });

  it('updates the current user and reapplies localization preferences', async () => {
    const updatedUser = {
      ...user,
      first_name: 'Grace',
      language: 'de',
      timezone: 'Europe/Berlin',
    };
    const localization = {
      useUserPreferences: vi.fn(() => 'de'),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthApiClient,
          useValue: {
            getCurrentUser: () => of(user),
            updateCurrentUser: () => of(updatedUser),
          },
        },
        {
          provide: DashboardLocalizationService,
          useValue: localization,
        },
      ],
    });

    const store = TestBed.inject(SessionStore);

    await store.updateCurrentUser({
      first_name: 'Grace',
      last_name: 'Coach',
      language: 'de',
      timezone: 'Europe/Berlin',
      email_preferences: user.email_preferences,
    });

    expect(store.mutationStatus()).toBe('success');
    expect(store.displayName()).toBe('Grace Coach');
    expect(localization.useUserPreferences).toHaveBeenCalledWith('de', 'Europe/Berlin');
  });
});
