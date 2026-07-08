import { NgClass } from '@angular/common';
import {
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
import { AgoraService } from '../../core/calls/agora.service';
import { CoachingApiClient } from '../../core/http/coaching-api.service';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';

@Component({
  selector: 'app-video-call-page',
  imports: [
    NgClass,
    TranslocoPipe,
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
      } @else {
        <section class="relative grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2 sm:gap-3">
          <div class="relative grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div class="relative min-h-0 overflow-hidden rounded-lg bg-stone-900">
              <div #remoteVideo class="h-full min-h-0 w-full"></div>
              @if (!remoteJoined()) {
                <div class="absolute inset-0 grid place-items-center bg-stone-900">
                  <p class="px-6 text-center text-sm font-semibold text-white/70">
                    {{ 'sessions.call.waiting' | transloco }}
                  </p>
                </div>
              }
            </div>

            <div
              class="absolute right-3 top-3 z-10 w-32 overflow-hidden rounded-lg border border-white/10 bg-stone-900 shadow-2xl sm:w-44 lg:static lg:z-auto lg:w-auto lg:shadow-none"
            >
              <div class="overflow-hidden bg-stone-900">
                <div #localVideo class="aspect-video w-full"></div>
              </div>
            </div>
          </div>

          @if (showDevicePanel()) {
            <section
              #devicePanel
              animate.enter="z-device-panel-enter"
              animate.leave="z-device-panel-leave"
              class="fixed inset-x-3 bottom-[5.75rem] z-50 mx-auto grid max-h-[min(22rem,calc(100dvh-7rem))] w-auto max-w-md gap-4 overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4 text-white shadow-2xl shadow-black/50 sm:bottom-24 sm:w-[24rem]"
            >
              <label class="grid gap-2 text-xs font-semibold">
                <span>{{ 'common.labels.microphone' | transloco }}</span>
                <select
                  class="min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-white outline-none transition focus:border-white/70 disabled:cursor-not-allowed disabled:opacity-60"
                  [value]="agora.selectedAudioDeviceId()"
                  [disabled]="!agora.localAudioTrack()"
                  (change)="setAudioDevice(selectEventValue($event))"
                >
                  @if (!agora.localAudioTrack()) {
                    <option value="">{{ 'sessions.call.noMicrophone' | transloco }}</option>
                  }
                  @for (option of audioOptions(); track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
              <label class="grid gap-2 text-xs font-semibold">
                <span>{{ 'common.labels.camera' | transloco }}</span>
                <select
                  class="min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-white outline-none transition focus:border-white/70 disabled:cursor-not-allowed disabled:opacity-60"
                  [value]="agora.selectedVideoDeviceId()"
                  [disabled]="!agora.localVideoTrack()"
                  (change)="setVideoDevice(selectEventValue($event))"
                >
                  @if (!agora.localVideoTrack()) {
                    <option value="">{{ 'sessions.call.noCamera' | transloco }}</option>
                  }
                  @for (option of videoOptions(); track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
            </section>
          }

          <footer
            class="mx-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/95 p-2 shadow-2xl shadow-black/30 backdrop-blur sm:gap-3 sm:p-3"
          >
            <button
              type="button"
              class="grid size-11 place-items-center rounded-md border border-zinc-700 bg-zinc-800 text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 sm:size-12"
              [ngClass]="
                agora.audioEnabled() ? '' : '!border-red-950/70 !bg-red-950/50 !text-red-400'
              "
              [disabled]="!agora.localAudioTrack()"
              [attr.aria-label]="'common.aria.toggleMicrophone' | transloco"
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
              class="grid size-11 place-items-center rounded-md border border-zinc-700 bg-zinc-800 text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 sm:size-12"
              [ngClass]="
                agora.videoEnabled() ? '' : '!border-red-950/70 !bg-red-950/50 !text-red-400'
              "
              [disabled]="!agora.localVideoTrack()"
              [attr.aria-label]="'common.aria.toggleCamera' | transloco"
              (click)="toggleVideo()"
            >
              @if (agora.videoEnabled()) {
                <svg lucideCamera class="size-5" aria-hidden="true"></svg>
              } @else {
                <svg lucideCameraOff class="size-5" aria-hidden="true"></svg>
              }
            </button>
            <button
              #settingsButton
              type="button"
              class="grid size-11 place-items-center rounded-md border border-zinc-700 bg-zinc-800 text-white transition hover:bg-zinc-700 sm:size-12"
              [attr.aria-label]="'common.aria.deviceSettings' | transloco"
              (click)="toggleDevicePanel()"
            >
              <svg lucideSettings class="size-5" aria-hidden="true"></svg>
            </button>
            <button
              type="button"
              class="inline-flex min-h-11 items-center gap-2 rounded-md border border-rose-600 bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 sm:min-h-12 sm:px-5"
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
  styles: `
    .z-device-panel-enter {
      animation: z-device-panel-in 120ms ease-out;
    }
    .z-device-panel-leave {
      animation: z-device-panel-out 100ms ease-in;
    }
    @keyframes z-device-panel-in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes z-device-panel-out {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(6px);
      }
    }
  `,
})
export class VideoCallPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(CoachingApiClient);
  protected readonly agora = inject(AgoraService);
  private readonly transloco = inject(TranslocoService);

  private readonly localVideo = viewChild<ElementRef<HTMLDivElement>>('localVideo');
  private readonly remoteVideo = viewChild<ElementRef<HTMLDivElement>>('remoteVideo');
  private readonly devicePanel = viewChild<ElementRef<HTMLElement>>('devicePanel');
  private readonly settingsButton = viewChild<ElementRef<HTMLElement>>('settingsButton');
  private groupId: string | null = null;
  private bookingId: string | null = null;
  private recordingStopRequested = false;

  protected readonly connecting = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly showDevicePanel = signal(false);
  protected readonly remoteJoined = computed(
    () => !!(this.agora.remoteAudioTrack() || this.agora.remoteVideoTrack()),
  );
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

  constructor() {
    effect(() => {
      const track = this.agora.localVideoTrack();
      const el = this.localVideo();
      if (track && el) track.play(el.nativeElement);
    });

    effect(() => {
      const track = this.agora.remoteVideoTrack();
      const el = this.remoteVideo();
      if (track && el) track.play(el.nativeElement);
    });
  }

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
      await this.agora.join(
        credentials.app_id,
        credentials.channel,
        credentials.token,
        credentials.uid,
      );
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
    void this.agora.leave();
  }

  protected toggleAudio(): void {
    void this.agora.toggleAudio();
  }

  protected toggleVideo(): void {
    void this.agora.toggleVideo();
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
    this.stopRecording();
    void this.agora.leave().then(() => this.backToSessions());
  }

  protected backToSessions(): void {
    void this.router.navigate(['/sessions', 'upcoming']);
  }

  private stopRecording(): void {
    if (!this.groupId || !this.bookingId || this.recordingStopRequested) return;
    this.recordingStopRequested = true;
    this.api.stopBookingRecording(this.groupId, this.bookingId).subscribe({
      error: () => {
        this.recordingStopRequested = false;
      },
    });
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.showDevicePanel()) return;
    const target = event.target as HTMLElement | null;
    const panel = this.devicePanel()?.nativeElement;
    const button = this.settingsButton()?.nativeElement;
    if (target && !panel?.contains(target) && !button?.contains(target)) {
      this.showDevicePanel.set(false);
    }
  }
}
