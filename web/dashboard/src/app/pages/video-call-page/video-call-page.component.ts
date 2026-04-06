import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
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
export class VideoCallPageComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coachingService = inject(CoachingService);
  protected readonly agora = inject(AgoraService);

  @ViewChild('localVideo') localVideoEl!: ElementRef<HTMLDivElement>;
  @ViewChild('remoteVideo') remoteVideoEl!: ElementRef<HTMLDivElement>;

  protected readonly sessionTitle = signal('');
  protected readonly connecting = signal(true);
  protected readonly error = signal('');

  protected readonly remoteUser = computed(() => {
    const users = this.agora.remoteUsers();
    const firstEntry = users.entries().next();
    return firstEntry.done ? null : firstEntry.value[1];
  });

  ngAfterViewInit(): void {
    const sessionId = this.route.snapshot.paramMap.get('id');
    if (!sessionId) {
      this.error.set('No session ID provided');
      this.connecting.set(false);
      return;
    }

    this.coachingService.getSession(sessionId).subscribe({
      next: (session) => this.sessionTitle.set(session.title),
    });

    this.coachingService.getConnectData(sessionId).subscribe({
      next: async (data) => {
        try {
          await this.agora.joinChannel(data.app_id, data.channel, data.token, data.uid);
          this.connecting.set(false);

          // Play local video
          if (this.localVideoEl?.nativeElement) {
            this.agora.playLocalVideo(this.localVideoEl.nativeElement);
          }
        } catch (err) {
          this.error.set(
            'Failed to join the call. Please check your camera and microphone permissions.',
          );
          this.connecting.set(false);
        }
      },
      error: (err) => {
        const message = err?.error || 'Failed to connect to session';
        this.error.set(typeof message === 'string' ? message : 'Failed to connect to session');
        this.connecting.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.agora.leaveChannel();
  }

  protected async onToggleMic(): Promise<void> {
    await this.agora.toggleMic();
  }

  protected async onToggleCamera(): Promise<void> {
    await this.agora.toggleCamera();
  }

  protected async onLeave(): Promise<void> {
    await this.agora.leaveChannel();
    this.router.navigate(['/coaching']);
  }

  protected playRemoteVideo(): void {
    const user = this.remoteUser();
    if (user && this.remoteVideoEl?.nativeElement) {
      this.agora.playRemoteVideo(user.uid, this.remoteVideoEl.nativeElement);
    }
  }
}
