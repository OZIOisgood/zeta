import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TuiButton, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { AvatarSelectorComponent } from '../../shared/components/avatar-selector/avatar-selector.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { GroupsService } from '../../shared/services/groups.service';

@Component({
  selector: 'app-create-group-page',
  standalone: true,
  imports: [
    CommonModule,
    PageContainerComponent,
    ReactiveFormsModule,
    TuiButton,
    TuiLabel,
    TuiTextfield,
    AvatarSelectorComponent,
  ],
  templateUrl: './create-group-page.component.html',
  styleUrls: ['./create-group-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateGroupPageComponent {
  private readonly groupsService = inject(GroupsService);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(1)]),
  });

  protected isSubmitting = false;
  protected avatarBase64: string | null = null;

  protected onAvatarChange(base64: string | null): void {
    if (base64) {
      this.avatarBase64 = base64.split(',')[1] || base64;
    } else {
      this.avatarBase64 = null;
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) {
      return;
    }

    const name = this.form.get('name')?.value;
    if (!name) {
      return;
    }

    this.isSubmitting = true;

    this.groupsService.create(name, this.avatarBase64 || undefined).subscribe({
      next: () => {
        this.router.navigate(['/groups']);
      },
      error: (error) => {
        console.error('Failed to create group:', error);
        this.isSubmitting = false;
      },
    });
  }

  protected onCancel(): void {
    this.router.navigate(['/groups']);
  }
}
