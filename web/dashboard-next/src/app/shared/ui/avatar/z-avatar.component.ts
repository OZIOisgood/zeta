import { Component, computed, input } from '@angular/core';
import { NgpAvatar, NgpAvatarFallback, NgpAvatarImage } from 'ng-primitives/avatar';

@Component({
  selector: 'z-avatar',
  hostDirectives: [NgpAvatar],
  imports: [NgpAvatarFallback, NgpAvatarImage],
  host: {
    class:
      'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--z-surface-warm)] text-sm font-semibold text-[var(--z-primary)]',
  },
  template: `
    @if (resolvedImage(); as image) {
      <img ngpAvatarImage class="size-full object-cover" [src]="image" [alt]="alt()" />
    }
    <span ngpAvatarFallback class="grid size-full place-items-center">{{ fallback() }}</span>
  `,
})
export class ZAvatarComponent {
  readonly image = input<string>();
  readonly fallback = input('');
  readonly alt = input('');
  protected readonly resolvedImage = computed(() => {
    const image = this.image();
    if (!image) return undefined;
    return image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
  });
}
