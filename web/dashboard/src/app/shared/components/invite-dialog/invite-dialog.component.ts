import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { InvitationsService } from '../../services/invitations.service';

@Component({
  selector: 'app-invite-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TuiButton, TuiLabel, TuiTextfield],
  templateUrl: './invite-dialog.component.html',
  styleUrls: ['./invite-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteDialogComponent {
  private readonly invitationsService = inject(InvitationsService);
  private readonly context = injectContext<TuiDialogContext<boolean, string>>();

  protected readonly emailControl = new FormControl('', [Validators.required, Validators.email]);
  protected isSubmitting = false;
  protected errorMessage = '';

  protected onSubmit(): void {
    if (this.emailControl.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const groupId = this.context.data;
    const email = this.emailControl.value!;

    this.invitationsService.create(groupId, email).subscribe({
      next: () => {
        this.context.completeWith(true);
      },
      error: (err) => {
        console.error('Failed to send invitation:', err);
        this.errorMessage = 'Failed to send invitation. Please try again.';
        this.isSubmitting = false;
      },
    });
  }

  protected onCancel(): void {
    this.context.completeWith(false);
  }
}
