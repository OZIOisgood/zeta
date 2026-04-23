import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
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
  private readonly coachingService = inject(CoachingService);
  protected readonly agoraService = inject(AgoraService);

  private readonly localVideoEl = viewChild<ElementRef<HTMLDivElement>>('localVideo');
  private readonly remoteVideoEl = viewChild<ElementRef<HTMLDivElement>>('remoteVideo');
  private readonly devicePanelRef = viewChild<ElementRef<HTMLElement>>('devicePanel');
  private readonly settingsBtnRef = viewChild<ElementRef<HTMLElement>>('settingsBtn');

  protected error = signal<string | null>(null);
  protected connecting = signal(true);
  protected audioEnabled = signal(true);
  protected videoEnabled = signal(true);
  protected showDevicePanel = signal(false);

  protected remoteJoined = computed(
    () => !!(this.agoraService.remoteAudioTrack() || this.agoraService.remoteVideoTrack()),
  );

  constructor() {
    // Play local video whenever the track and element are both available.
    effect(() => {
      const track = this.agoraService.localVideoTrack();
      const el = this.localVideoEl();
      if (track && el) {
        track.play(el.nativeElement);
      }
    });

    // Play remote video whenever the track and element are both available.
    effect(() => {
      const track = this.agoraService.remoteVideoTrack();
      const el = this.remoteVideoEl();
      if (track && el) {
        track.play(el.nativeElement);
      }
    });
  }

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
          })
          .catch((err) => {
            this.error.set(err.message || 'Failed to join video call');
            this.connecting.set(false);
          });
      },
      error: (err) => {
        this.error.set(err.error || 'Failed to connect to session');
        this.connecting.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.agoraService.leave();
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showDevicePanel()) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const panel = this.devicePanelRef()?.nativeElement;
    const btn = this.settingsBtnRef()?.nativeElement;
    if ((!panel || !panel.contains(target)) && (!btn || !btn.contains(target))) {
      this.showDevicePanel.set(false);
    }
  }

  protected toggleDevicePanel(): void {
    this.showDevicePanel.update((v) => !v);
  }

  protected setAudioDevice(event: Event): void {
    this.agoraService.setAudioDevice((event.target as HTMLSelectElement).value);
  }

  protected setVideoDevice(event: Event): void {
    this.agoraService.setVideoDevice((event.target as HTMLSelectElement).value);
  }
}
