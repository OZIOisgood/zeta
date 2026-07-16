import { NgClass } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  LucideCamera,
  LucideCameraOff,
  LucideMic,
  LucideMicOff,
  LucidePhoneOff,
  LucideSettings,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { AgoraMediaError, AgoraService } from '../../core/calls/agora.service';
import { ParticipantTileState } from '../../core/calls/coaching-call.types';
import { CoachingApiClient, ConnectResponse } from '../../core/http/coaching-api.service';
import { ParticipantTileComponent } from '../../features/coaching-call/participant-tile.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';

@Component({
  selector: 'app-video-call-page',
  imports: [
    NgClass,
    TranslocoPipe,
    ParticipantTileComponent,
    ZButtonComponent,
    LucideCamera,
    LucideCameraOff,
    LucideMic,
    LucideMicOff,
    LucidePhoneOff,
    LucideSettings,
  ],
  template: `
    <main class="h-dvh overflow-hidden bg-stone-950 p-2 text-white sm:p-3">
      @if (connecting()) {
        <div class="grid h-full place-items-center">
          <div class="text-center">
            <div
              class="mx-auto size-12 animate-spin rounded-full border-2 border-white/20 border-t-[var(--z-primary)]"
            ></div>
            <p class="mt-4 text-sm font-semibold">{{ 'sessions.call.connecting' | transloco }}</p>
          </div>
        </div>
      } @else if (error()) {
        <div class="grid h-full place-items-center">
          <section
            class="max-w-md rounded-lg border border-white/10 bg-white p-6 text-center text-[var(--z-text)] shadow-2xl"
          >
            <h1 class="text-xl font-semibold">{{ 'sessions.call.couldNotJoin' | transloco }}</h1>
            <p class="mt-2 text-sm leading-6 text-[var(--z-muted)]">{{ error() }}</p>
            <z-button class="mt-5 block" type="button" (pressed)="backToSessions()">
              {{ 'sessions.call.backToSessions' | transloco }}
            </z-button>
          </section>
        </div>
      } @else if (credentials(); as session) {
        <section
          class="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 sm:gap-3"
        >
          <header class="flex min-h-9 items-center justify-center">
            <span class="rounded-md bg-white/10 px-3 py-1 text-xs font-semibold">{{
              timerLabel()
            }}</span>
          </header>

          <div class="relative min-h-0 overflow-hidden rounded-lg bg-stone-900">
            <app-participant-tile [state]="remoteTile()" videoFit="contain" />
            <div
              class="absolute right-3 top-3 z-10 aspect-video w-32 overflow-hidden rounded-lg border border-white/15 shadow-2xl sm:w-48 lg:w-[24%] lg:max-w-72"
            >
              <app-participant-tile [state]="localTile()" videoFit="cover" />
            </div>

            @if (!agora.localAudioTrack() && !agora.localVideoTrack()) {
              <div
                class="absolute inset-x-3 bottom-3 z-20 mx-auto max-w-md rounded-lg border border-white/15 bg-black/75 p-3 text-center backdrop-blur"
              >
                <p class="text-sm font-semibold">
                  {{ 'sessions.call.devicesOptional' | transloco }}
                </p>
                @if (mediaErrorMessage()) {
                  <p class="mt-1 text-xs text-amber-200">{{ mediaErrorMessage() }}</p>
                }
                <button
                  type="button"
                  class="mt-3 min-h-11 rounded-md bg-white px-4 text-sm font-semibold text-stone-950"
                  (click)="enableMedia()"
                >
                  {{ 'sessions.call.enableDevices' | transloco }}
                </button>
              </div>
            }
          </div>

          @if (showDevicePanel()) {
            <section
              class="fixed inset-x-3 bottom-24 z-50 mx-auto grid max-h-[22rem] max-w-md gap-4 overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"
            >
              <label class="grid gap-2 text-xs font-semibold">
                <span>{{ 'common.labels.microphone' | transloco }}</span>
                <select
                  class="min-h-11 rounded-md border border-zinc-700 bg-zinc-900 px-3"
                  [value]="agora.selectedAudioDeviceId()"
                  [disabled]="!agora.localAudioTrack()"
                  (change)="setAudioDevice(selectEventValue($event))"
                >
                  @for (option of audioOptions(); track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
              <label class="grid gap-2 text-xs font-semibold">
                <span>{{ 'common.labels.camera' | transloco }}</span>
                <select
                  class="min-h-11 rounded-md border border-zinc-700 bg-zinc-900 px-3"
                  [value]="agora.selectedVideoDeviceId()"
                  [disabled]="!agora.localVideoTrack()"
                  (change)="setVideoDevice(selectEventValue($event))"
                >
                  @for (option of videoOptions(); track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
            </section>
          }

          <footer
            class="mx-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/95 p-2 shadow-2xl sm:gap-3 sm:p-3"
          >
            <button
              type="button"
              class="grid size-11 place-items-center rounded-md border border-zinc-700 bg-zinc-800"
              [ngClass]="
                agora.audioEnabled() ? '' : '!border-red-950/70 !bg-red-950/50 !text-red-400'
              "
              [disabled]="!agora.localAudioTrack()"
              (click)="toggleAudio()"
            >
              @if (agora.audioEnabled()) {
                <svg lucideMic class="size-5" aria-hidden="true"></svg>
              } @else {
                <svg lucideMicOff class="size-5" aria-hidden="true"></svg>
              }
            </button>
            <button
              type="button"
              class="grid size-11 place-items-center rounded-md border border-zinc-700 bg-zinc-800"
              [ngClass]="
                agora.videoEnabled() ? '' : '!border-red-950/70 !bg-red-950/50 !text-red-400'
              "
              [disabled]="!agora.localVideoTrack()"
              (click)="toggleVideo()"
            >
              @if (agora.videoEnabled()) {
                <svg lucideCamera class="size-5" aria-hidden="true"></svg>
              } @else {
                <svg lucideCameraOff class="size-5" aria-hidden="true"></svg>
              }
            </button>
            <button
              type="button"
              class="grid size-11 place-items-center rounded-md border border-zinc-700 bg-zinc-800"
              (click)="toggleDevicePanel()"
            >
              <svg lucideSettings class="size-5" aria-hidden="true"></svg>
            </button>
            <button
              type="button"
              class="inline-flex min-h-11 items-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-semibold"
              (click)="leave()"
            >
              <svg lucidePhoneOff class="size-5" aria-hidden="true"></svg>
              <span>{{ 'common.aria.leaveCall' | transloco }}</span>
            </button>
          </footer>
        </section>
      }
    </main>
  `,
})
export class VideoCallPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(CoachingApiClient);
  protected readonly agora = inject(AgoraService);
  private readonly transloco = inject(TranslocoService);
  private groupId: string | null = null;
  private bookingId: string | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private eventSeq = 0;

  protected readonly connecting = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly showDevicePanel = signal(false);
  protected readonly credentials = signal<ConnectResponse | null>(null);
  protected readonly now = signal(Date.now());
  protected readonly remoteTile = computed<ParticipantTileState>(() => {
    const session = this.credentials()!;
    const remoteIdentity = session.caller_role === 'student' ? session.expert : session.student;
    const remote = this.agora.remoteParticipants().get(remoteIdentity.uid);
    return {
      identity: remoteIdentity,
      presence: remote?.presence ?? 'waiting',
      audioEnabled: remote?.audioPublished ?? false,
      videoEnabled: remote?.videoPublished ?? false,
      videoTrack: remote?.videoTrack,
    };
  });
  protected readonly localTile = computed<ParticipantTileState>(() => {
    const session = this.credentials()!;
    const identity = session.caller_role === 'student' ? session.student : session.expert;
    return {
      identity,
      presence: this.agora.connectionState() === 'reconnecting' ? 'reconnecting' : 'joined',
      audioEnabled: this.agora.audioEnabled(),
      videoEnabled: this.agora.videoEnabled(),
      videoTrack: this.agora.localVideoTrack(),
    };
  });
  protected readonly timerLabel = computed(() => {
    const session = this.credentials();
    if (!session) return '';
    const remaining = new Date(session.scheduled_ends_at).getTime() - this.now();
    const totalSeconds = Math.floor(Math.abs(remaining) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return remaining >= 0
      ? this.transloco.translate('sessions.call.endsIn', { time: `${minutes}:${seconds}` })
      : this.transloco.translate('sessions.call.overtime', { time: `${minutes}:${seconds}` });
  });
  protected readonly audioOptions = computed(() =>
    this.agora.audioDevices().map((device, index) => ({
      value: device.deviceId,
      label:
        device.label ||
        this.transloco.translate('sessions.call.microphoneFallback', { index: index + 1 }),
    })),
  );
  protected readonly videoOptions = computed(() =>
    this.agora.videoDevices().map((device, index) => ({
      value: device.deviceId,
      label:
        device.label ||
        this.transloco.translate('sessions.call.cameraFallback', { index: index + 1 }),
    })),
  );

  async ngOnInit(): Promise<void> {
    this.groupId = this.route.snapshot.paramMap.get('groupId');
    this.bookingId = this.route.snapshot.paramMap.get('bookingId');
    if (!this.groupId || !this.bookingId) {
      this.error.set(this.transloco.translate('sessions.call.missingBooking'));
      this.connecting.set(false);
      return;
    }
    try {
      const credentials = await firstValueFrom(
        this.api.connectToBooking(this.groupId, this.bookingId),
      );
      this.credentials.set(credentials);
      await this.agora.join(
        credentials.app_id,
        credentials.channel,
        credentials.token,
        credentials.uid,
        [1, 2],
      );
      this.sendPresence('joined');
      this.heartbeat = setInterval(() => {
        this.sendPresence(
          this.agora.connectionState() === 'reconnecting' ? 'reconnecting' : 'joined',
        );
      }, 10_000);
      this.timer = setInterval(() => this.now.set(Date.now()), 1_000);
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : this.transloco.translate('sessions.call.connectFailed'),
      );
    } finally {
      this.connecting.set(false);
    }
  }

  ngOnDestroy(): void {
    this.clearIntervals();
    if (this.agora.localJoined()) this.sendPresence('left');
    void this.agora.leave();
  }

  protected async enableMedia(): Promise<void> {
    await this.agora.enableLocalMedia();
    this.sendPresence('joined');
  }
  protected async toggleAudio(): Promise<void> {
    await this.agora.toggleAudio();
    this.sendPresence('joined');
  }
  protected async toggleVideo(): Promise<void> {
    await this.agora.toggleVideo();
    this.sendPresence('joined');
  }
  protected setAudioDevice(deviceId: string): void {
    void this.agora.setAudioDevice(deviceId);
  }
  protected setVideoDevice(deviceId: string): void {
    void this.agora.setVideoDevice(deviceId);
  }
  protected selectEventValue(event: Event): string {
    return (event.target as HTMLSelectElement | null)?.value ?? '';
  }
  protected toggleDevicePanel(): void {
    this.showDevicePanel.update((open) => !open);
  }
  protected leave(): void {
    this.clearIntervals();
    this.sendPresence('left');
    void this.agora.leave().then(() => this.backToSessions());
  }
  protected backToSessions(): void {
    void this.router.navigate(['/sessions', 'upcoming']);
  }
  protected mediaErrorMessage(): string {
    const key: Record<AgoraMediaError, string> = {
      permission_denied: 'sessions.call.permissionDenied',
      device_missing: 'sessions.call.deviceMissing',
      device_busy: 'sessions.call.deviceBusy',
      unsupported: 'sessions.call.unsupported',
      publish_failed: 'sessions.call.publishFailed',
      network: 'sessions.call.mediaFailed',
    };
    const error = this.agora.mediaError();
    return error ? this.transloco.translate(key[error]) : '';
  }

  private sendPresence(state: 'joined' | 'reconnecting' | 'left'): void {
    const session = this.credentials();
    if (!session || !this.groupId || !this.bookingId) return;
    this.eventSeq += 1;
    this.api
      .updateBookingPresence(this.groupId, this.bookingId, {
        connection_id: session.connection_id,
        event_seq: this.eventSeq,
        state,
        audio_published: !!this.agora.localAudioTrack(),
        audio_enabled: this.agora.audioEnabled(),
        video_published: !!this.agora.localVideoTrack(),
        video_enabled: this.agora.videoEnabled(),
      })
      .subscribe({ error: () => undefined });
  }

  private clearIntervals(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.timer) clearInterval(this.timer);
    this.heartbeat = null;
    this.timer = null;
  }

  @HostListener('document:keydown.escape')
  protected closeDevicePanel(): void {
    this.showDevicePanel.set(false);
  }
}
