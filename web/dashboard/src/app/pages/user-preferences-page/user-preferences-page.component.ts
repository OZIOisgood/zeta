import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TuiStringHandler } from '@taiga-ui/cdk';
import { TuiAlertService, TuiButton, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import {
  TuiCheckbox,
  TuiChevron,
  TuiComboBox,
  TuiDataListWrapper,
  TuiSelect,
  TuiTabs,
} from '@taiga-ui/kit';
import { AvatarSelectorComponent } from '../../shared/components/avatar-selector/avatar-selector.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { AuthService } from '../../shared/services/auth.service';
import { PermissionsService } from '../../shared/services/permissions.service';

@Component({
  selector: 'app-user-preferences-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageContainerComponent,
    SectionHeaderComponent,
    TuiTabs,
    TuiButton,
    TuiLabel,
    TuiTextfield,
    TuiSelect,
    TuiChevron,
    TuiComboBox,
    TuiCheckbox,
    TuiDataListWrapper,
    AvatarSelectorComponent,
  ],
  templateUrl: './user-preferences-page.component.html',
  styleUrls: ['./user-preferences-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPreferencesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly permissions = inject(PermissionsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly alerts = inject(TuiAlertService);

  private readonly allTimezones: string[] = Intl.supportedValuesOf('timeZone');
  private readonly tabs = ['personal-data', 'email-preferences'] as const;

  protected readonly activeTabIndex = signal(0);
  protected readonly filteredTimezones = signal<string[]>(this.allTimezones);
  protected readonly canReceiveAssetUploadEmails = computed(() =>
    this.permissions.hasPermission('groups:create'),
  );
  protected readonly canReceiveAssetReviewEmails = computed(() =>
    this.permissions.hasPermission('assets:create'),
  );
  protected readonly canReceiveInvitationEmails = computed(() =>
    this.permissions.hasPermission('groups:invites:create'),
  );
  protected readonly canReceiveCoachingEmails = computed(() =>
    this.permissions.hasPermission('coaching:bookings:read'),
  );
  private readonly defaultEmailPreferences = {
    notifications_enabled: true,
    asset_uploads_enabled: true,
    asset_reviews_enabled: true,
    invitation_updates_enabled: true,
    group_membership_updates_enabled: true,
    coaching_booking_updates_enabled: true,
    coaching_reminders_enabled: true,
  };

  protected readonly languages = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
  ];

  protected readonly stringifyLanguage: TuiStringHandler<{ code: string; name: string }> = (item) =>
    item.name;

  protected readonly timezoneStringify = (tz: string): string => {
    try {
      const offset =
        new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
          .formatToParts(new Date())
          .find((p) => p.type === 'timeZoneName')?.value ?? '';
      return `${tz} (${offset})`;
    } catch {
      return tz;
    }
  };

  protected readonly form = new FormGroup({
    first_name: new FormControl('', [Validators.required]),
    last_name: new FormControl('', [Validators.required]),
    language: new FormControl(this.languages[0], [Validators.required]),
    timezone: new FormControl<string | null>(null, [Validators.required]),
    email_preferences: new FormGroup({
      notifications_enabled: new FormControl(true, { nonNullable: true }),
      asset_uploads_enabled: new FormControl(true, { nonNullable: true }),
      asset_reviews_enabled: new FormControl(true, { nonNullable: true }),
      invitation_updates_enabled: new FormControl(true, { nonNullable: true }),
      group_membership_updates_enabled: new FormControl(true, { nonNullable: true }),
      coaching_booking_updates_enabled: new FormControl(true, { nonNullable: true }),
      coaching_reminders_enabled: new FormControl(true, { nonNullable: true }),
    }),
  });

  protected isSubmitting = false;
  protected newAvatarBase64: string | null = null;
  protected avatarChanged = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.applyTab(params.get('tab'));
    });

    const user = this.auth.user();

    if (user) {
      this.form.patchValue({
        first_name: user.first_name,
        last_name: user.last_name,
        language:
          this.languages.find((l) => l.code === (user.language || 'en')) || this.languages[0],
        timezone: user.timezone,
        email_preferences: {
          ...this.defaultEmailPreferences,
          ...(user.email_preferences ?? {}),
        },
      });
      this.form.markAsPristine();
    }

    this.form.controls.timezone.valueChanges.subscribe(() => {
      this.filteredTimezones.set(this.allTimezones);
      this.cdr.markForCheck();
    });
  }

  protected onSearch(event: Event): void {
    const q = ((event.target as HTMLInputElement).value ?? '').toLowerCase().trim();
    this.filteredTimezones.set(
      q ? this.allTimezones.filter((tz) => tz.toLowerCase().includes(q)) : this.allTimezones,
    );
    this.cdr.markForCheck();
  }

  protected onTabIndexChange(index: number): void {
    const tab = this.tabs[index] ?? this.tabs[0];
    void this.router.navigate(['/preferences', tab]);
  }

  protected getInitialAvatar(): string | null {
    const avatar = this.auth.user()?.avatar;
    if (!avatar) return null;
    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  }

  protected onAvatarChange(base64: string | null): void {
    this.newAvatarBase64 = base64 ? base64.split(',')[1] || base64 : null;
    this.avatarChanged = true;
  }

  protected get isSaveDisabled(): boolean {
    return this.form.invalid || this.isSubmitting || (!this.form.dirty && !this.avatarChanged);
  }

  protected onSubmit(): void {
    if (this.isSaveDisabled) return;

    const first_name = this.form.controls.first_name.value;
    const last_name = this.form.controls.last_name.value;
    const languageObj = this.form.controls.language.value;
    const timezone = this.form.controls.timezone.value;
    const email_preferences = this.form.controls.email_preferences.getRawValue();

    if (!first_name || !last_name || !languageObj || !timezone) return;

    this.isSubmitting = true;

    this.auth
      .updateUser({
        first_name,
        last_name,
        language: languageObj.code,
        timezone,
        email_preferences,
        ...(this.avatarChanged && this.newAvatarBase64 ? { avatar: this.newAvatarBase64 } : {}),
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.avatarChanged = false;
          this.newAvatarBase64 = null;
          this.form.markAsPristine();
          this.alerts
            .open('Preferences updated successfully', { appearance: 'positive' })
            .subscribe();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Failed to save preferences:', error);
          this.isSubmitting = false;
          this.alerts.open('Failed to update preferences', { appearance: 'negative' }).subscribe();
          this.cdr.markForCheck();
        },
      });
  }

  private applyTab(tab: string | null): void {
    const index = this.tabs.findIndex((candidate) => candidate === tab);

    if (index === -1) {
      void this.router.navigate(['/preferences', this.tabs[0]], { replaceUrl: true });
      return;
    }

    this.activeTabIndex.set(index);
  }
}
