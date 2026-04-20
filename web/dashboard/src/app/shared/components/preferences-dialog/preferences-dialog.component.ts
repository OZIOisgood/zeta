import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiStringHandler } from '@taiga-ui/cdk';
import { TuiButton, TuiDialogContext, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiComboBox, TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { forkJoin, Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CoachingService } from '../../services/coaching.service';
import { AvatarSelectorComponent } from '../avatar-selector/avatar-selector.component';

@Component({
  selector: 'app-preferences-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiLabel,
    TuiTextfield,
    TuiSelect,
    TuiChevron,
    TuiComboBox,
    TuiDataListWrapper,
    AvatarSelectorComponent,
  ],
  templateUrl: './preferences-dialog.component.html',
  styleUrls: ['./preferences-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferencesDialogComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly coachingService = inject(CoachingService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly context = injectContext<TuiDialogContext<void>>();

  private readonly allTimezones: string[] = Intl.supportedValuesOf('timeZone');
  protected filteredTimezones: string[] = this.allTimezones;
  protected readonly timezoneControl = new FormControl<string | null>(null);
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

  protected readonly languages = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
  ];

  protected readonly stringifyLanguage: TuiStringHandler<{ code: string; name: string }> = (item) =>
    item.name;

  protected readonly form = new FormGroup({
    first_name: new FormControl(this.auth.user()?.first_name || '', [Validators.required]),
    last_name: new FormControl(this.auth.user()?.last_name || '', [Validators.required]),
    language: new FormControl(
      this.languages.find((l) => l.code === (this.auth.user()?.language || 'en')) ||
        this.languages[0],
      [Validators.required],
    ),
  });

  protected isSubmitting = false;
  protected newAvatarBase64: string | null = null;

  ngOnInit(): void {
    this.coachingService.getMyTimezone().subscribe({
      next: (res) => {
        this.timezoneControl.setValue(res.timezone, { emitEvent: false });
        this.cdr.markForCheck();
      },
    });
    this.timezoneControl.valueChanges.subscribe(() => {
      this.filteredTimezones = this.allTimezones;
      this.cdr.markForCheck();
    });
  }

  protected onSearch(event: Event): void {
    const q = ((event.target as HTMLInputElement).value ?? '').toLowerCase().trim();
    this.filteredTimezones = q
      ? this.allTimezones.filter((tz) => tz.toLowerCase().includes(q))
      : this.allTimezones;
    this.cdr.markForCheck();
  }

  protected getInitialAvatar(): string | null {
    const user = this.auth.user();
    if (!user) {
      return null;
    }
    const url = user.avatar;
    return url.startsWith('http') || url.startsWith('data:')
      ? url
      : `data:image/jpeg;base64,${url}`;
  }

  protected onAvatarChange(base64: string | null): void {
    if (base64) {
      // Remove prefix if present
      this.newAvatarBase64 = base64.split(',')[1] || base64;
    } else {
      this.newAvatarBase64 = null;
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) {
      return;
    }

    const first_name = this.form.get('first_name')?.value;
    const last_name = this.form.get('last_name')?.value;
    const languageObj = this.form.get('language')?.value as { code: string; name: string } | null;
    const language = languageObj?.code;

    if (!first_name || !last_name || !language) {
      return;
    }

    this.isSubmitting = true;

    const profileSave = this.auth.updateUser({
      first_name,
      last_name,
      language,
      ...(this.newAvatarBase64 ? { avatar: this.newAvatarBase64 } : {}),
    });

    const tz = this.timezoneControl.value;
    const saves: Observable<unknown>[] = [profileSave];
    if (tz && this.allTimezones.includes(tz)) {
      saves.push(this.coachingService.setMyTimezone(tz));
    }

    forkJoin(saves).subscribe({
      next: () => {
        this.context.completeWith();
      },
      error: (error) => {
        console.error('Failed to save preferences:', error);
        this.isSubmitting = false;
        this.cdr.markForCheck();
      },
    });
  }

  protected onCancel(): void {
    this.context.completeWith();
  }
}
