import { Component, computed, input } from '@angular/core';
import { LucideUsers } from '@lucide/angular';
import { NgpAvatar, NgpAvatarFallback, NgpAvatarImage } from 'ng-primitives/avatar';
import { Group } from '../../../core/http/groups-api.service';

@Component({
  selector: 'z-group-card',
  imports: [NgpAvatar, NgpAvatarFallback, NgpAvatarImage, LucideUsers],
  host: {
    '[class]': 'classes()',
  },
  template: `
    <div class="flex h-full items-start gap-3">
      <span
        ngpAvatar
        class="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
      >
        @if (avatarSrc(); as avatar) {
          <img ngpAvatarImage class="size-full object-cover" [src]="avatar" alt="" />
        }
        <span ngpAvatarFallback class="grid size-full place-items-center">
          <svg lucideUsers class="size-6" aria-hidden="true"></svg>
        </span>
      </span>
      <span class="min-w-0 flex-1 self-start">
        <span class="block truncate text-base font-semibold">{{ group().name }}</span>
        <span class="mt-1 line-clamp-2 block text-sm leading-5 text-[var(--z-muted)]">
          {{ description() }}
        </span>
      </span>
    </div>
  `,
})
export class ZGroupCardComponent {
  readonly group = input.required<Group>();
  readonly noDescription = input('');
  readonly selected = input(false);
  protected readonly classes = computed(() =>
    [
      'block h-full rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-[var(--z-primary-soft)] hover:bg-[var(--z-surface-warm)]',
      this.selected()
        ? 'border-[var(--z-primary)] ring-1 ring-orange-100'
        : 'border-[var(--z-border)]',
    ].join(' '),
  );
  protected readonly description = computed(() => {
    const description = this.group().description?.trim() || this.noDescription();
    return description.length > 120 ? `${description.slice(0, 120).trimEnd()}...` : description;
  });
  protected readonly avatarSrc = computed(() => {
    const avatar = this.group().avatar;
    if (!avatar) return undefined;
    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  });
}
