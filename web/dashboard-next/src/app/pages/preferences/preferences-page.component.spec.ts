import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { User } from '../../core/http/auth-api.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { SessionStore } from '../../features/session/session.store';
import { PreferencesPageComponent } from './preferences-page.component';

const user: User = {
  id: 'user-1',
  email: 'coach@example.com',
  first_name: 'Ada',
  last_name: 'Coach',
  language: 'en',
  avatar: '',
  timezone: 'Europe/Rome',
  role: 'expert',
  permissions: [
    'assets:create',
    'coaching:bookings:read',
    'groups:create',
    'groups:invites:create',
  ],
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

describe('PreferencesPageComponent', () => {
  const mutationStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  const session = {
    user: signal<User | null>(user),
    mutationStatus,
    hasPermission: (permission: string) => user.permissions.includes(permission),
    updateCurrentUser: vi.fn(async (data) => ({ ...user, ...data })),
  };
  const shell = {
    setLanguage: vi.fn(),
    showToast: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mutationStatus.set('idle');

    await TestBed.configureTestingModule({
      imports: [
        PreferencesPageComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              common: {
                actions: { save: 'Save' },
                aria: { avatarPreview: 'Avatar preview' },
                fields: { avatar: 'Avatar', language: 'Language', timezone: 'Timezone' },
              },
              avatar: {
                invalidImage: 'Invalid image',
                loadFailed: 'Failed to load image',
                optionalRequirement: 'Optional avatar',
                readFailed: 'Failed to read file',
                selectImage: 'Select image',
                sizeExceeded: 'Image size {{size}}KB exceeds limit',
              },
              preferences: {
                avatarTitle: 'Profile image',
                email: {
                  all: 'All notification emails',
                  allDescription: 'Disable all emails.',
                  coachingBookings: 'Coaching bookings',
                  coachingReminders: 'Coaching reminders',
                  groupMembership: 'Group membership updates',
                  invitationActivity: 'Invitation activity',
                  newVideos: 'New videos',
                  reviewedVideos: 'Reviewed videos',
                },
                emailPreferences: 'Email preferences',
                emailSummary: 'Choose email notifications.',
                firstName: 'First Name',
                firstNameRequired: 'First name is required.',
                languages: { de: 'German', en: 'English', fr: 'French' },
                lastName: 'Last Name',
                lastNameRequired: 'Last name is required.',
                languageRequired: 'Please select a language.',
                noTimezones: 'No matching timezones',
                noLanguages: 'No matching languages',
                personalData: 'Personal data',
                personalSummary: 'Update your profile.',
                saveFailed: 'Failed to update preferences',
                saveSuccess: 'Preferences updated successfully',
                saving: 'Saving...',
                searchLanguages: 'Search languages',
                searchTimezones: 'Search timezones',
                selectLanguage: 'Select a language',
                selectTimezone: 'Select a timezone',
                summary: 'Manage your preferences.',
                title: 'Preferences',
                toggleLanguages: 'Toggle language options',
                toggleTimezones: 'Toggle timezone options',
                timezoneRequired: 'Please select a timezone.',
              },
              toast: { title: 'Saved' },
            },
          },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ tab: 'email-preferences' })) },
        },
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
        {
          provide: SessionStore,
          useValue: session,
        },
        {
          provide: AppShellStore,
          useValue: shell,
        },
      ],
    }).compileComponents();
  });

  it('renders the permission-relevant email preference controls', async () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('All notification emails');
    expect(fixture.nativeElement.textContent).toContain('New videos');
    expect(fixture.nativeElement.textContent).toContain('Coaching reminders');
  });

  it('saves profile changes through the session store', async () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    const component = fixture.componentInstance;

    await fixture.whenStable();
    component['form'].controls.first_name.setValue('Grace');
    component['form'].controls.first_name.markAsDirty();
    await component['save']();

    expect(session.updateCurrentUser).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: 'Grace', language: 'en', timezone: 'Europe/Rome' }),
    );
    expect(shell.setLanguage).toHaveBeenCalledWith('en');
    expect(shell.showToast).toHaveBeenCalledWith(
      'Saved',
      'Preferences updated successfully',
      'success',
    );
  });

  it('uses select-like combobox controls for both language and timezone', async () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);

    await fixture.whenStable();
    fixture.componentInstance['activeTab'].set('personal-data');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('z-combobox')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('z-combobox input')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('z-select')).toBeNull();
  });

  it('enables save only while profile values differ from the saved user', async () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);

    await fixture.whenStable();
    fixture.componentInstance['activeTab'].set('personal-data');
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('z-text-input input') as HTMLInputElement;
    const button = () => fixture.nativeElement.querySelector('button[type="submit"]');

    expect(button().disabled).toBe(true);

    input.value = 'Ada1';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(button().disabled).toBe(false);

    input.value = 'Ada';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(button().disabled).toBe(true);
  });

  it('shows a translated inline error for a dirty invalid profile field', async () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);

    await fixture.whenStable();
    fixture.componentInstance['activeTab'].set('personal-data');
    fixture.componentInstance['form'].controls.first_name.setValue('');
    fixture.componentInstance['form'].controls.first_name.markAsDirty();
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('#preferences-first-name-error');
    const input = fixture.nativeElement.querySelector('z-text-input input');

    expect(error?.textContent).toContain('First name is required.');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(input?.getAttribute('aria-describedby')).toBe('preferences-first-name-error');
  });
});
