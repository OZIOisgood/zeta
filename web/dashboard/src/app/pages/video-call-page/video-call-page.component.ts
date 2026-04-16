import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { AgoraService } from '../../shared/services/agora.service';
import { CoachingService } from '../../shared/services/coaching.service';

@Component({
  selector: 'app-video-call-page',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiIcon],
  templateUrl: './video-call-page.component.html',
  styleUrls: ['./video-call-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoCallPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly coachingService = inject(CoachingService);
  private readonly agoraService = inject(AgoraService);

  @ViewChild('localVideo', { static: false }) localVideoEl!: ElementRef<HTMLDivElement>;
  @ViewChild('remoteVideo', { static: false }) remoteVideoEl!: ElementRef<HTMLDivElement>;

  protected error = signal<string | null>(null);
  protected connecting = signal(true);
  protected audioEnabled = signal(true);
  protected videoEnabled = signal(true);
  protected remoteJoined = signal(false);

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const groupId = this.route.snapshot.paramMap.get('groupId');
    const bookingId = this.route.snapshot.paramMap.get('bookingId');

    if (!groupId || !bookingId) {
      this.error.set('Missing booking information');
      this.connecting.set(false);
      return;
    }

    this.coachingService.connectToBooking(groupId, bookingId).subscribe({
      next: (res) => {
        this.agoraService
          .join(res.app_id, res.channel, res.token, res.uid)
          .then(() => {
            this.connecting.set(false);
            this.cdr.markForCheck();
            // Defer to next tick so Angular renders the #localVideo element first.
            setTimeout(() => {
              this.renderLocalVideo();
              this.startRemotePoll();
            });
          })
          .catch((err) => {
            this.error.set(err.message || 'Failed to join video call');
            this.connecting.set(false);
            this.cdr.markForCheck();
          });
      },
      error: (err) => {
        this.error.set(err.error || 'Failed to connect to session');
        this.connecting.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.agoraService.leave();
  }

  private renderLocalVideo(): void {
    const state = this.agoraService.getState();
    if (state.localVideoTrack && this.localVideoEl) {
      state.localVideoTrack.play(this.localVideoEl.nativeElement);
    }
  }

  private startRemotePoll(): void {
    // Poll for remote video track since events may fire before ViewChild resolves.
    this.pollInterval = setInterval(() => {
      const state = this.agoraService.getState();
      if (state.remoteVideoTrack && this.remoteVideoEl) {
        if (!this.remoteJoined()) {
          this.remoteJoined.set(true);
          state.remoteVideoTrack.play(this.remoteVideoEl.nativeElement);
          this.cdr.markForCheck();
        }
      } else if (this.remoteJoined()) {
        this.remoteJoined.set(false);
        this.cdr.markForCheck();
      }
    }, 500);
  }

  protected toggleAudio(): void {
    const enabled = this.agoraService.toggleAudio();
    this.audioEnabled.set(enabled);
  }

  protected toggleVideo(): void {
    const enabled = this.agoraService.toggleVideo();
    this.videoEnabled.set(enabled);
  }

  protected leave(): void {
    this.agoraService.leave().then(() => {
      this.router.navigate(['/sessions']);
    });
  }
}
