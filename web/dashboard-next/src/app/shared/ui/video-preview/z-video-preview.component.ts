import { Component, computed, input, signal } from '@angular/core';
import { LucideVideo } from '@lucide/angular';
import { NgpHover } from 'ng-primitives/interactions';

@Component({
  selector: 'z-video-preview',
  imports: [NgpHover, LucideVideo],
  host: {
    class: 'block overflow-hidden',
  },
  template: `
    <span
      ngpHover
      class="grid size-full place-items-center overflow-hidden overscroll-auto bg-[var(--z-surface-warm)] text-[var(--z-primary)] touch-auto"
      (ngpHover)="hovered.set($event)"
    >
      @if (backgroundImage(); as image) {
        <span
          data-preview-image
          class="size-full bg-cover bg-center transition-transform duration-300"
          [class.scale-105]="hovered()"
          [style.background-image]="image"
          aria-hidden="true"
        ></span>
      } @else {
        <svg lucideVideo class="size-6" aria-hidden="true"></svg>
      }
    </span>
  `,
})
export class ZVideoPreviewComponent {
  readonly thumbnail = input<string>();
  protected readonly hovered = signal(false);
  protected readonly backgroundImage = computed(() => {
    const thumbnail = this.thumbnail();
    if (!thumbnail) return undefined;

    const image = this.hovered()
      ? thumbnail.replace(/\/thumbnail\.[a-z]+(?=[?#]|$)/i, '/animated.gif')
      : thumbnail;

    return `url(${image})`;
  });
}
