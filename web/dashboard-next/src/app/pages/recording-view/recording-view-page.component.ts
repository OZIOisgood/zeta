import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AgoraService } from '../../core/calls/agora.service';
import { ParticipantTileState } from '../../core/calls/coaching-call.types';
import {
  RecordingViewApiClient,
  RecordingViewCredentials,
} from '../../core/http/recording-view-api.service';
import { ParticipantTileComponent } from '../../features/coaching-call/participant-tile.component';

@Component({
  selector: 'app-recording-view-page',
  imports: [ParticipantTileComponent],
  providers: [AgoraService],
  template: `
    <main class="grid min-h-dvh place-items-center overflow-hidden bg-black">
      @if (credentials()) {
        <section class="relative aspect-video w-full max-w-[100vw] overflow-hidden bg-stone-950">
          <app-participant-tile [state]="studentTile()" videoFit="contain" />
          <div
            class="absolute bottom-[4%] right-[3%] z-10 aspect-video w-[24%] max-w-[28%] overflow-hidden rounded-lg border border-white/20 shadow-2xl"
          >
            <app-participant-tile [state]="expertTile()" videoFit="cover" />
          </div>
          <img
            class="absolute bottom-[4%] left-[3%] z-20 h-[7%] min-h-8 opacity-90"
            src="/assets/brand/strido/strido-horse-mark-light.svg"
            alt="Strido"
          />
        </section>
      } @else {
        <div class="size-full bg-black" aria-label="Recording view unavailable"></div>
      }
    </main>
  `,
})
export class RecordingViewPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(RecordingViewApiClient);
  private readonly agora = inject(AgoraService);
  protected readonly credentials = signal<RecordingViewCredentials | null>(null);
  protected readonly studentTile = computed<ParticipantTileState>(() => {
    const session = this.credentials()!;
    const state = this.agora.remoteParticipants().get(session.student.uid);
    return {
      identity: session.student,
      presence: state?.presence ?? 'waiting',
      audioEnabled: state?.audioPublished ?? false,
      videoEnabled: state?.videoPublished ?? false,
      videoTrack: state?.videoTrack,
    };
  });
  protected readonly expertTile = computed<ParticipantTileState>(() => {
    const session = this.credentials()!;
    const state = this.agora.remoteParticipants().get(session.expert.uid);
    return {
      identity: session.expert,
      presence: state?.presence ?? 'waiting',
      audioEnabled: state?.audioPublished ?? false,
      videoEnabled: state?.videoPublished ?? false,
      videoTrack: state?.videoTrack,
    };
  });

  async ngOnInit(): Promise<void> {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const capability = params.get('cap');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!capability) return;
    for (const delay of [0, 1_000, 2_000, 4_000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const credentials = await firstValueFrom(this.api.exchange(capability));
        await this.agora.join(
          credentials.app_id,
          credentials.channel,
          credentials.token,
          credentials.uid,
          [credentials.student.uid, credentials.expert.uid],
        );
        this.credentials.set(credentials);
        (navigator as Navigator & { notifyReady?: () => void }).notifyReady?.();
        return;
      } catch {
        await this.agora.leave();
      }
    }
    this.credentials.set(null);
  }

  ngOnDestroy(): void {
    void this.agora.leave();
  }
}
