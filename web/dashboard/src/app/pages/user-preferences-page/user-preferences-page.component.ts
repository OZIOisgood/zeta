import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiStringHandler } from '@taiga-ui/cdk';
import { TuiAlertService, TuiButton, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiComboBox, TuiDataListWrapper, TuiSelect, TuiTabs } from '@taiga-ui/kit';
import { AvatarSelectorComponent } from '../../shared/components/avatar-selector/avatar-selector.component';
import { BreadcrumbsComponent } from '../../shared/components/breadcrumbs/breadcrumbs.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-user-preferences-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageContainerComponent,
    BreadcrumbsComponent,
    SectionHeaderComponent,
    TuiTabs,
    TuiButton,
    TuiLabel,
    TuiTextfield,
    TuiSelect,
    TuiChevron,
    TuiComboBox,
    TuiDataListWrapper,
    AvatarSelectorComponent,
  ],
  templateUrl: './user-preferences-page.component.html',
  styleUrls: ['./user-preferences-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPreferencesPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly alerts = inject(TuiAlertService);

  private readonly allTimezones: string[] = Intl.supportedValuesOf('timeZone');

  protected readonly activeTabIndex = signal(0);
  protected readonly filteredTimezones = signal<string[]>(this.allTimezones);
  protected readonly breadcrumbs = [{ label: 'Preferences' }];

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
  });

  protected isSubmitting = false;
  protected newAvatarBase64: string | null = null;
  protected avatarChanged = false;

  ngOnInit(): void {
    const user = this.auth.user();

    if (user) {
      this.form.patchValue({
        first_name: user.first_name,
        last_name: user.last_name,
        language:
          this.languages.find((l) => l.code === (user.language || 'en')) || this.languages[0],
        timezone: user.timezone,
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

    if (!first_name || !last_name || !languageObj || !timezone) return;

    this.isSubmitting = true;

    this.auth
      .updateUser({
        first_name,
        last_name,
        language: languageObj.code,
        timezone,
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
}
