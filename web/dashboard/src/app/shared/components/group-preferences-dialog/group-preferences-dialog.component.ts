import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  TuiAlertService,
  TuiButton,
  TuiDialogContext,
  TuiDialogService,
  TuiLabel,
  TuiTextfield,
} from '@taiga-ui/core';
import { TUI_CONFIRM, TuiTextarea, type TuiConfirmData } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { filter, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Group, GroupsService } from '../../services/groups.service';
import { AvatarSelectorComponent } from '../avatar-selector/avatar-selector.component';

@Component({
  selector: 'app-group-preferences-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiLabel,
    TuiTextfield,
    TuiTextarea,
    AvatarSelectorComponent,
    TranslatePipe,
  ],
  templateUrl: './group-preferences-dialog.component.html',
  styleUrls: ['./group-preferences-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupPreferencesDialogComponent {
  private readonly groupsService = inject(GroupsService);
  private readonly auth = inject(AuthService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly alerts = inject(TuiAlertService);
  private readonly translate = inject(TranslateService);
  private readonly context = injectContext<TuiDialogContext<Group | null, Group>>();

  protected get group(): Group {
    return this.context.data;
  }

  protected readonly isOwner = computed(() => this.auth.user()?.id === this.group.owner_id);

  protected readonly form = new FormGroup({
    name: new FormControl(this.group.name, [Validators.required]),
    description: new FormControl(this.group.description || ''),
  });

  protected isSubmitting = false;
  protected isDeleting = false;
  protected newAvatarBase64: string | null = null;

  protected getInitialAvatar(): string | null {
    const avatar = this.group.avatar;
    if (!avatar) return null;
    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  }

  protected onAvatarChange(base64: string | null): void {
    this.newAvatarBase64 = base64 ? base64.split(',')[1] || base64 : null;
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) return;

    const name = this.form.get('name')?.value;
    const description = this.form.get('description')?.value;

    if (!name) return;

    this.isSubmitting = true;

    this.groupsService
      .update(this.group.id, {
        name,
        description: description || '',
        ...(this.newAvatarBase64 ? { avatar: this.newAvatarBase64 } : {}),
      })
      .subscribe({
        next: (updated) => {
          this.context.completeWith(updated);
        },
        error: (err) => {
          console.error('Failed to update group:', err);
          this.isSubmitting = false;
        },
      });
  }

  protected onDeleteGroup(): void {
    if (this.isDeleting) return;

    const data: TuiConfirmData = {
      content: this.translate.instant('groups.deleteConfirm'),
      yes: this.translate.instant('groups.deleteGroup'),
      no: this.translate.instant('common.actions.cancel'),
      appearance: 'destructive',
    };

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('groups.deleteGroup'),
        size: 's',
        data,
      })
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.isDeleting = true;
          return this.groupsService.delete(this.group.id);
        }),
      )
      .subscribe({
        next: () => {
          this.context.completeWith(null);
        },
        error: (err) => {
          console.error('Failed to delete group:', err);
          this.isDeleting = false;
          this.alerts.open(this.translate.instant('groups.deleteFailed'), { appearance: 'negative' }).subscribe();
        },
      });
  }

  protected onCancel(): void {
    this.context.$implicit.complete();
  }
}
