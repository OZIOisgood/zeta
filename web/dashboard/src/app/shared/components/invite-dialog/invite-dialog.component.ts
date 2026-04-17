import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { TuiButton, TuiDialogContext, TuiIcon, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { InvitationsService } from '../../services/invitations.service';

@Component({
  selector: 'app-invite-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TuiButton, TuiIcon, TuiLabel, TuiTextfield],
  templateUrl: './invite-dialog.component.html',
  styleUrls: ['./invite-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteDialogComponent {
  private readonly invitationsService = inject(InvitationsService);
  private readonly context = injectContext<TuiDialogContext<boolean, string>>();
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly emailControl = new FormControl('', [Validators.required, Validators.email]);
  protected isSubmitting = false;
  protected errorMessage = '';
  protected qrImageUrl: SafeUrl | null = null;
  protected inviteLink = '';
  protected linkCopied = false;
  private qrBlobUrl: string | null = null;

  protected onSubmit(): void {
    if (this.emailControl.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const groupId = this.context.data;
    const email = this.emailControl.value!;

    this.invitationsService.create(groupId, email).subscribe({
      next: (result) => {
        this.inviteLink = `${window.location.origin}/groups?invite=${result.code}`;
        this.invitationsService.getQrCode(groupId, result.id).subscribe({
          next: (blob) => {
            this.qrBlobUrl = URL.createObjectURL(blob);
            this.qrImageUrl = this.sanitizer.bypassSecurityTrustUrl(this.qrBlobUrl);
            this.isSubmitting = false;
            this.cdr.markForCheck();
          },
          error: () => {
            // QR failed but invitation was created — still show success
            this.isSubmitting = false;
            this.cdr.markForCheck();
          },
        });
      },
      error: (err) => {
        console.error('Failed to send invitation:', err);
        this.errorMessage = 'Failed to send invitation. Please try again.';
        this.isSubmitting = false;
      },
    });
  }

  protected onCopyLink(): void {
    navigator.clipboard.writeText(this.inviteLink).then(() => {
      this.linkCopied = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.linkCopied = false;
        this.cdr.markForCheck();
      }, 2000);
    });
  }

  protected onDownloadQr(): void {
    if (!this.qrBlobUrl) return;
    const a = document.createElement('a');
    a.href = this.qrBlobUrl;
    a.download = 'invitation-qr.png';
    a.click();
  }

  protected onClose(): void {
    if (this.qrBlobUrl) {
      URL.revokeObjectURL(this.qrBlobUrl);
    }
    this.context.completeWith(!!this.inviteLink);
  }
}
