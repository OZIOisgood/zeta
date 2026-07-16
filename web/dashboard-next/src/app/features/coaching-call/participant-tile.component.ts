import { NgClass } from '@angular/common';
import { Component, ElementRef, computed, effect, input, viewChild } from '@angular/core';
import { LucideMicOff } from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { ZAvatarComponent } from '../../shared/ui/avatar/z-avatar.component';
import { ParticipantTileState } from '../../core/calls/coaching-call.types';

@Component({
  selector: 'app-participant-tile',
  imports: [NgClass, LucideMicOff, TranslocoPipe, ZAvatarComponent],
  host: { class: 'relative block h-full min-h-0 w-full overflow-hidden bg-stone-900' },
  template: `
    <div
      #videoTarget
      class="absolute inset-0 h-full w-full"
      [class.hidden]="!state().videoEnabled || !state().videoTrack"
    ></div>

    @if (!state().videoEnabled || !state().videoTrack) {
      <div
        class="absolute inset-0 grid place-items-center bg-stone-900 text-center text-white"
        [class.p-1]="compact()"
        [class.p-4]="!compact()"
      >
        <div class="grid justify-items-center" [class.gap-3]="!compact()">
          <z-avatar
            class="shadow-lg"
            [ngClass]="compact() ? 'size-10 text-sm' : 'size-20 text-2xl sm:size-24'"
            [image]="state().identity.avatar"
            [fallback]="initials()"
            [alt]="state().identity.display_name"
          />
          @if (!compact()) {
            <div>
              <p class="font-semibold">{{ state().identity.display_name }}</p>
              <p class="mt-1 text-xs text-white/65">{{ statusKey() | transloco }}</p>
            </div>
          }
        </div>
      </div>
    }

    <div
      class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent text-white"
      [class.p-2]="compact()"
      [class.pt-6]="compact()"
      [class.p-3]="!compact()"
      [class.pt-10]="!compact()"
    >
      <span class="truncate text-xs font-semibold">{{ state().identity.display_name }}</span>
      @if (!state().audioEnabled) {
        <span
          class="grid size-7 shrink-0 place-items-center rounded-md bg-black/65"
          aria-label="Microphone off"
        >
          <svg lucideMicOff class="size-4" aria-hidden="true"></svg>
        </span>
      }
    </div>
  `,
})
export class ParticipantTileComponent {
  readonly state = input.required<ParticipantTileState>();
  readonly videoFit = input<'contain' | 'cover'>('cover');
  readonly compact = input(false);
  private readonly videoTarget = viewChild<ElementRef<HTMLDivElement>>('videoTarget');
  private readonly activeVideoTrack = computed(() => {
    const state = this.state();
    return state.videoEnabled ? state.videoTrack : null;
  });

  constructor() {
    effect((onCleanup) => {
      const track = this.activeVideoTrack();
      const target = this.videoTarget()?.nativeElement;
      if (!track || !target) return;
      track.play(target, { fit: this.videoFit(), mirror: false });
      onCleanup(() => track.stop());
    });
  }

  protected initials(): string {
    return this.state()
      .identity.display_name.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  protected statusKey(): string {
    switch (this.state().presence) {
      case 'reconnecting':
        return 'sessions.call.reconnecting';
      case 'joined':
        return 'sessions.call.cameraOff';
      case 'left':
        return 'sessions.call.participantLeft';
      default:
        return 'sessions.call.waitingShort';
    }
  }
}
