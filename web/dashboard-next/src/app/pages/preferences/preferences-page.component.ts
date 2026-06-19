import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideBell, LucideCircleUserRound, LucideSave } from '@lucide/angular';
import { EmailPreferences } from '../../core/http/auth-api.service';
import {
  DASHBOARD_LANGUAGES,
  DashboardLanguage,
} from '../../core/i18n/dashboard-localization.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { SessionStore } from '../../features/session/session.store';
import { ZAvatarInputComponent } from '../../shared/ui/avatar-input/z-avatar-input.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZCheckboxComponent } from '../../shared/ui/checkbox/z-checkbox.component';
import { ZComboboxComponent } from '../../shared/ui/combobox/z-combobox.component';
import { ZFieldErrorComponent } from '../../shared/ui/field-error/z-field-error.component';
import { ZFieldLabelComponent } from '../../shared/ui/field-label/z-field-label.component';
import { SelectOption } from '../../shared/ui/select/z-select.component';
import { ZTabPanelComponent } from '../../shared/ui/tabs/z-tab-panel.component';
import { ZTabsComponent } from '../../shared/ui/tabs/z-tabs.component';
import { ZTextInputComponent } from '../../shared/ui/text-input/z-text-input.component';
import { InviteCodesSectionComponent } from '../invite-codes/invite-codes-section.component';

type PreferencesTab = 'personal-data' | 'email-preferences' | 'invite-codes';
type PreferencesFormValue = {
  first_name: string;
  last_name: string;
  language: DashboardLanguage;
  timezone: string;
  avatar: string | null;
  email_preferences: EmailPreferences;
};

const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  notifications_enabled: true,
  asset_uploads_enabled: true,
  asset_reviews_enabled: true,
  invitation_updates_enabled: true,
  group_membership_updates_enabled: true,
  coaching_booking_updates_enabled: true,
  coaching_reminders_enabled: true,
};

@Component({
  selector: 'app-preferences-page',
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    TranslocoPipe,
    ZAvatarInputComponent,
    ZButtonComponent,
    ZCheckboxComponent,
    ZComboboxComponent,
    ZFieldErrorComponent,
    ZFieldLabelComponent,
    ZTabPanelComponent,
    ZTabsComponent,
    ZTextInputComponent,
    InviteCodesSectionComponent,
    LucideBell,
    LucideCircleUserRound,
    LucideSave,
  ],
  template: `
    <div class="grid gap-6">
      <section class="rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
        <div>
          <h1 class="text-2xl font-semibold sm:text-3xl">{{ 'preferences.title' | transloco }}</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--z-muted)]">
            {{ 'preferences.summary' | transloco }}
          </p>
        </div>
      </section>

      <z-tabs
        tabsId="preferences-tabs"
        [label]="'preferences.title' | transloco"
        [options]="tabOptions()"
        [value]="activeTab()"
        (valueChange)="setTab($event)"
      />

      <z-tab-panel tabsId="preferences-tabs" [value]="activeTab()">
        @if (activeTab() === 'invite-codes') {
          <app-invite-codes-section />
        } @else {
          <form class="grid gap-5" [formGroup]="form" (ngSubmit)="save()">
            @if (activeTab() === 'personal-data') {
              <section
                class="grid gap-5 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm"
              >
                <div class="flex items-start gap-3 border-b border-[var(--z-border)] pb-4">
                  <span
                    class="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
                  >
                    <svg lucideCircleUserRound class="size-5" aria-hidden="true"></svg>
                  </span>
                  <div>
                    <h2 class="text-base font-semibold">
                      {{ 'preferences.personalData' | transloco }}
                    </h2>
                    <p class="mt-1 text-sm leading-5 text-[var(--z-muted)]">
                      {{ 'preferences.personalSummary' | transloco }}
                    </p>
                  </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="grid gap-2">
                    <z-field-label
                      [label]="'preferences.firstName' | transloco"
                      [control]="form.controls.first_name"
                    />
                    <z-text-input
                      formControlName="first_name"
                      autocomplete="given-name"
                      ariaDescribedBy="preferences-first-name-error"
                      [invalid]="
                        (form.controls.first_name.dirty || form.controls.first_name.touched) &&
                        form.controls.first_name.invalid
                      "
                    />
                    @if (
                      (form.controls.first_name.dirty || form.controls.first_name.touched) &&
                      form.controls.first_name.invalid
                    ) {
                      <z-field-error
                        id="preferences-first-name-error"
                        [message]="'preferences.firstNameRequired' | transloco"
                      />
                    }
                  </label>

                  <label class="grid gap-2">
                    <z-field-label
                      [label]="'preferences.lastName' | transloco"
                      [control]="form.controls.last_name"
                    />
                    <z-text-input
                      formControlName="last_name"
                      autocomplete="family-name"
                      ariaDescribedBy="preferences-last-name-error"
                      [invalid]="
                        (form.controls.last_name.dirty || form.controls.last_name.touched) &&
                        form.controls.last_name.invalid
                      "
                    />
                    @if (
                      (form.controls.last_name.dirty || form.controls.last_name.touched) &&
                      form.controls.last_name.invalid
                    ) {
                      <z-field-error
                        id="preferences-last-name-error"
                        [message]="'preferences.lastNameRequired' | transloco"
                      />
                    }
                  </label>

                  <label class="grid gap-2">
                    <z-field-label
                      [label]="'common.fields.language' | transloco"
                      [control]="form.controls.language"
                    />
                    <z-combobox
                      ariaDescribedBy="preferences-language-error"
                      [invalid]="
                        (form.controls.language.dirty || form.controls.language.touched) &&
                        form.controls.language.invalid
                      "
                      [label]="'preferences.searchLanguages' | transloco"
                      [toggleLabel]="'preferences.toggleLanguages' | transloco"
                      [noOptionsLabel]="'preferences.noLanguages' | transloco"
                      [options]="languageOptions()"
                      [value]="form.controls.language.value"
                      [placeholder]="'preferences.selectLanguage' | transloco"
                      (valueChange)="setLanguage($event)"
                    />
                    @if (
                      (form.controls.language.dirty || form.controls.language.touched) &&
                      form.controls.language.invalid
                    ) {
                      <z-field-error
                        id="preferences-language-error"
                        [message]="'preferences.languageRequired' | transloco"
                      />
                    }
                  </label>

                  <label class="grid gap-2">
                    <z-field-label
                      [label]="'common.fields.timezone' | transloco"
                      [control]="form.controls.timezone"
                    />
                    <z-combobox
                      ariaDescribedBy="preferences-timezone-error"
                      [invalid]="
                        (form.controls.timezone.dirty || form.controls.timezone.touched) &&
                        form.controls.timezone.invalid
                      "
                      [label]="'preferences.searchTimezones' | transloco"
                      [toggleLabel]="'preferences.toggleTimezones' | transloco"
                      [noOptionsLabel]="'preferences.noTimezones' | transloco"
                      [placeholder]="'preferences.selectTimezone' | transloco"
                      [options]="timezoneOptions"
                      [value]="form.controls.timezone.value || undefined"
                      (valueChange)="setTimezone($event)"
                    />
                    @if (
                      (form.controls.timezone.dirty || form.controls.timezone.touched) &&
                      form.controls.timezone.invalid
                    ) {
                      <z-field-error
                        id="preferences-timezone-error"
                        [message]="'preferences.timezoneRequired' | transloco"
                      />
                    }
                  </label>
                </div>

                <z-avatar-input
                  formControlName="avatar"
                  [label]="'common.fields.avatar' | transloco"
                  [helperTitle]="'preferences.avatarTitle' | transloco"
                  [helperText]="'avatar.optionalRequirement' | transloco"
                  [previewLabel]="'common.aria.avatarPreview' | transloco"
                  [selectLabel]="'avatar.selectImage' | transloco"
                  [invalidImageMessage]="'avatar.invalidImage' | transloco"
                  [sizeExceededMessage]="'avatar.sizeExceeded' | transloco"
                  [loadFailedMessage]="'avatar.loadFailed' | transloco"
                  [readFailedMessage]="'avatar.readFailed' | transloco"
                />
              </section>
            } @else {
              <section
                class="grid gap-5 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm"
                formGroupName="email_preferences"
              >
                <div class="flex items-start gap-3 border-b border-[var(--z-border)] pb-4">
                  <span
                    class="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
                  >
                    <svg lucideBell class="size-5" aria-hidden="true"></svg>
                  </span>
                  <div>
                    <h2 class="text-base font-semibold">
                      {{ 'preferences.emailPreferences' | transloco }}
                    </h2>
                    <p class="mt-1 text-sm leading-5 text-[var(--z-muted)]">
                      {{ 'preferences.emailSummary' | transloco }}
                    </p>
                  </div>
                </div>

                <div
                  class="rounded-md border border-[var(--z-border)] bg-[var(--z-surface-warm)] p-4"
                >
                  <label class="flex items-start gap-3">
                    <z-checkbox
                      [label]="'preferences.email.all' | transloco"
                      [checked]="emailControls.notifications_enabled.value"
                      (checkedChange)="setEmailPreference('notifications_enabled', $event)"
                    />
                    <span>
                      <span class="block text-sm font-semibold">
                        {{ 'preferences.email.all' | transloco }}
                      </span>
                      <span class="mt-1 block text-xs leading-5 text-[var(--z-muted)]">
                        {{ 'preferences.email.allDescription' | transloco }}
                      </span>
                    </span>
                  </label>
                </div>

                <div class="grid gap-3 md:grid-cols-2">
                  @if (canReceiveAssetUploadEmails()) {
                    <ng-container
                      [ngTemplateOutlet]="emailOption"
                      [ngTemplateOutletContext]="{
                        key: 'asset_uploads_enabled',
                        label: 'preferences.email.newVideos',
                      }"
                    />
                  }
                  @if (canReceiveAssetReviewEmails()) {
                    <ng-container
                      [ngTemplateOutlet]="emailOption"
                      [ngTemplateOutletContext]="{
                        key: 'asset_reviews_enabled',
                        label: 'preferences.email.reviewedVideos',
                      }"
                    />
                  }
                  @if (canReceiveInvitationEmails()) {
                    <ng-container
                      [ngTemplateOutlet]="emailOption"
                      [ngTemplateOutletContext]="{
                        key: 'invitation_updates_enabled',
                        label: 'preferences.email.invitationActivity',
                      }"
                    />
                  }
                  <ng-container
                    [ngTemplateOutlet]="emailOption"
                    [ngTemplateOutletContext]="{
                      key: 'group_membership_updates_enabled',
                      label: 'preferences.email.groupMembership',
                    }"
                  />
                  @if (canReceiveCoachingEmails()) {
                    <ng-container
                      [ngTemplateOutlet]="emailOption"
                      [ngTemplateOutletContext]="{
                        key: 'coaching_booking_updates_enabled',
                        label: 'preferences.email.coachingBookings',
                      }"
                    />
                    <ng-container
                      [ngTemplateOutlet]="emailOption"
                      [ngTemplateOutletContext]="{
                        key: 'coaching_reminders_enabled',
                        label: 'preferences.email.coachingReminders',
                      }"
                    />
                  }
                </div>
              </section>
            }

            <ng-template #emailOption let-key="key" let-label="label">
              <label
                class="flex items-start gap-3 rounded-md border border-[var(--z-border)] bg-white p-4 transition"
                [class.opacity-60]="!emailControls.notifications_enabled.value"
              >
                <z-checkbox
                  [label]="label | transloco"
                  [checked]="emailControlValue(key)"
                  [disabled]="!emailControls.notifications_enabled.value"
                  (checkedChange)="setEmailPreference(key, $event)"
                />
                <span class="text-sm font-semibold leading-5">{{ label | transloco }}</span>
              </label>
            </ng-template>

            @if (feedback() === 'error') {
              <p
                class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
                role="alert"
              >
                {{ 'preferences.saveFailed' | transloco }}
              </p>
            }

            <div class="flex justify-end">
              <z-button type="submit" [disabled]="saveDisabled()">
                <svg lucideSave class="size-4" aria-hidden="true"></svg>
                <span>
                  {{
                    (session.mutationStatus() === 'loading'
                      ? 'preferences.saving'
                      : 'common.actions.save'
                    ) | transloco
                  }}
                </span>
              </z-button>
            </div>
          </form>
        }
      </z-tab-panel>
    </div>
  `,
})
export class PreferencesPageComponent {
  protected readonly session = inject(SessionStore);
  private readonly shell = inject(AppShellStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly _translationEvents = toSignal(this.transloco.events$, { initialValue: null });
  private readonly allTimezones = Intl.supportedValuesOf('timeZone');

  protected readonly activeTab = signal<PreferencesTab>('personal-data');
  protected readonly feedback = signal<'error' | null>(null);
  private readonly formRevision = signal(0);
  private readonly initialFormValue = signal<PreferencesFormValue | null>(null);
  protected readonly form = new FormGroup({
    first_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    last_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    language: new FormControl<DashboardLanguage>('en', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    timezone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    avatar: new FormControl<string | null>(null),
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
  protected readonly emailControls = this.form.controls.email_preferences.controls;
  protected readonly timezoneOptions: SelectOption[] = this.allTimezones.map((timezone) => ({
    value: timezone,
    label: this.timezoneLabel(timezone),
  }));
  protected readonly languageOptions = computed<SelectOption[]>(() => {
    this._translationEvents();

    return DASHBOARD_LANGUAGES.map((language) => ({
      value: language.value,
      label: this.transloco.translate(language.nameKey),
    }));
  });
  protected readonly canManageInviteCodes = computed(() => {
    const r = this.session.user()?.role;
    return r === 'expert' || r === 'admin';
  });
  protected readonly tabOptions = computed(() => {
    this._translationEvents();

    const options = [
      { value: 'personal-data', label: this.transloco.translate('preferences.personalData') },
      {
        value: 'email-preferences',
        label: this.transloco.translate('preferences.emailPreferences'),
      },
    ];

    if (this.canManageInviteCodes()) {
      options.push({
        value: 'invite-codes',
        label: this.transloco.translate('common.nav.inviteCodes'),
      });
    }

    return options;
  });
  protected readonly canReceiveAssetUploadEmails = computed(() =>
    this.session.hasPermission('groups:create'),
  );
  protected readonly canReceiveAssetReviewEmails = computed(() =>
    this.session.hasPermission('assets:create'),
  );
  protected readonly canReceiveInvitationEmails = computed(() =>
    this.session.hasPermission('groups:invites:create'),
  );
  protected readonly canReceiveCoachingEmails = computed(() =>
    this.session.hasPermission('coaching:bookings:read'),
  );
  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.formRevision.update((revision) => revision + 1);
    });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'personal-data' || tab === 'email-preferences') {
        this.activeTab.set(tab);
        return;
      }

      if (tab === 'invite-codes' && this.canManageInviteCodes()) {
        this.activeTab.set(tab);
        return;
      }

      void this.router.navigate(['/preferences', 'personal-data'], { replaceUrl: true });
    });

    effect(() => {
      const user = this.session.user();
      if (!user) return;

      const formValue = {
        first_name: user.first_name,
        last_name: user.last_name,
        language: DASHBOARD_LANGUAGES.some((language) => language.value === user.language)
          ? (user.language as DashboardLanguage)
          : 'en',
        timezone: user.timezone,
        avatar: user.avatar || null,
        email_preferences: {
          ...DEFAULT_EMAIL_PREFERENCES,
          ...(user.email_preferences ?? {}),
        },
      };
      this.form.patchValue(formValue, { emitEvent: false });
      this.initialFormValue.set(this.normalizeFormValue(formValue));
      this.formRevision.update((revision) => revision + 1);
      this.form.markAsPristine();
    });
  }

  protected setTab(tab: string): void {
    if (tab === 'personal-data' || tab === 'email-preferences' || tab === 'invite-codes') {
      void this.router.navigate(['/preferences', tab]);
    }
  }

  protected setLanguage(language: string): void {
    if (DASHBOARD_LANGUAGES.some((option) => option.value === language)) {
      this.form.controls.language.setValue(language as DashboardLanguage);
      this.form.controls.language.markAsDirty();
    }
  }

  protected setTimezone(timezone: string): void {
    this.form.controls.timezone.setValue(timezone);
    this.form.controls.timezone.markAsDirty();
  }

  protected emailControlValue(key: keyof EmailPreferences): boolean {
    return this.emailControls[key].value;
  }

  protected setEmailPreference(key: keyof EmailPreferences, checked: boolean): void {
    this.emailControls[key].setValue(checked);
    this.emailControls[key].markAsDirty();
  }

  protected saveDisabled(): boolean {
    this.formRevision();

    return (
      this.form.invalid || !this.hasFormChanges() || this.session.mutationStatus() === 'loading'
    );
  }

  protected async save(): Promise<void> {
    if (this.saveDisabled()) return;

    this.feedback.set(null);
    const rawValue = this.form.getRawValue();
    const user = await this.session.updateCurrentUser({
      first_name: rawValue.first_name,
      last_name: rawValue.last_name,
      language: rawValue.language,
      timezone: rawValue.timezone,
      email_preferences: rawValue.email_preferences,
      ...(this.form.controls.avatar.dirty ? { avatar: rawValue.avatar ?? '' } : {}),
    });

    if (!user) {
      this.feedback.set('error');
      return;
    }

    this.shell.setLanguage(user.language);
    this.shell.showToast(
      this.transloco.translate('toast.title'),
      this.transloco.translate('preferences.saveSuccess'),
      'success',
    );
    this.initialFormValue.set(this.currentFormValue());
    this.formRevision.update((revision) => revision + 1);
    this.form.markAsPristine();
  }

  private hasFormChanges(): boolean {
    const initialValue = this.initialFormValue();

    return !!initialValue && !this.sameFormValue(this.currentFormValue(), initialValue);
  }

  private currentFormValue(): PreferencesFormValue {
    return this.normalizeFormValue(this.form.getRawValue());
  }

  private normalizeFormValue(value: PreferencesFormValue): PreferencesFormValue {
    return {
      first_name: value.first_name.trim(),
      last_name: value.last_name.trim(),
      language: value.language,
      timezone: value.timezone,
      avatar: value.avatar ?? null,
      email_preferences: { ...value.email_preferences },
    };
  }

  private sameFormValue(left: PreferencesFormValue, right: PreferencesFormValue): boolean {
    return (
      left.first_name === right.first_name &&
      left.last_name === right.last_name &&
      left.language === right.language &&
      left.timezone === right.timezone &&
      left.avatar === right.avatar &&
      Object.keys(DEFAULT_EMAIL_PREFERENCES).every((key) => {
        const preferenceKey = key as keyof EmailPreferences;

        return left.email_preferences[preferenceKey] === right.email_preferences[preferenceKey];
      })
    );
  }

  private timezoneLabel(timezone: string): string {
    try {
      const offset =
        new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
          .formatToParts(new Date())
          .find((part) => part.type === 'timeZoneName')?.value ?? '';

      return offset ? `${timezone} (${offset})` : timezone;
    } catch {
      return timezone;
    }
  }
}
