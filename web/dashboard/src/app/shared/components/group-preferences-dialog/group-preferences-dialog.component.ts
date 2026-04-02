import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { TuiTextarea } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
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
  ],
  templateUrl: './group-preferences-dialog.component.html',
  styleUrls: ['./group-preferences-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupPreferencesDialogComponent {
  private readonly groupsService = inject(GroupsService);
  private readonly context = injectContext<TuiDialogContext<Group, Group>>();

  protected get group(): Group {
    return this.context.data;
  }

  protected readonly form = new FormGroup({
    name: new FormControl(this.group.name, [Validators.required]),
    description: new FormControl(this.group.description || ''),
  });

  protected isSubmitting = false;
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

  protected onCancel(): void {
    this.context.$implicit.complete();
  }
}
