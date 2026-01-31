import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiStringHandler } from '@taiga-ui/cdk';
import { TuiButton, TuiDialogContext, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { AuthService } from '../../services/auth.service';
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
    TuiDataListWrapper,
    AvatarSelectorComponent,
  ],
  templateUrl: './preferences-dialog.component.html',
  styleUrls: ['./preferences-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferencesDialogComponent {
  private readonly auth = inject(AuthService);
  private readonly context = injectContext<TuiDialogContext<void>>();

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

  protected getInitialAvatar(): string | null {
    const user = this.auth.user();
    if (user?.profile_picture_url) return user.profile_picture_url;
    return null;
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

    this.auth
      .updateUser({
        first_name,
        last_name,
        language,
        avatar: this.newAvatarBase64 || undefined,
      })
      .subscribe({
        next: () => {
          this.context.completeWith();
        },
        error: (error) => {
          console.error('Failed to update user:', error);
          this.isSubmitting = false;
          // Ideally show error toast
        },
      });
  }

  protected onCancel(): void {
    this.context.completeWith();
  }
}
