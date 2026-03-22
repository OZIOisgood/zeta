import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiAutoColorPipe, TuiButton, TuiDialogContext, TuiInitialsPipe } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { InvitationInfo, InvitationsService } from '../../services/invitations.service';

@Component({
  selector: 'app-accept-invite-dialog',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiAvatar, TuiAutoColorPipe, TuiInitialsPipe],
  templateUrl: './accept-invite-dialog.component.html',
  styleUrls: ['./accept-invite-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptInviteDialogComponent {
  private readonly invitationsService = inject(InvitationsService);
  private readonly context = injectContext<TuiDialogContext<string | null, InvitationInfo>>();

  protected readonly info = this.context.data;
  protected isSubmitting = false;

  protected onAccept(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    this.invitationsService.accept(this.info.code).subscribe({
      next: (res) => {
        this.context.completeWith(res.group_id);
      },
      error: (err) => {
        console.error('Failed to accept invitation:', err);
        this.isSubmitting = false;
      },
    });
  }

  protected onDecline(): void {
    this.context.completeWith(null);
  }
}
