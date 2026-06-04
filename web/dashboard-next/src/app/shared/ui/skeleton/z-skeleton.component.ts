import { Component } from '@angular/core';

@Component({
  selector: 'z-skeleton',
  host: {
    class:
      'relative overflow-hidden rounded-md bg-[var(--z-surface-muted)] before:absolute before:inset-0 before:-translate-x-full before:animate-[z-shimmer_1.4s_infinite] before:bg-linear-to-r before:from-transparent before:via-white/55 before:to-transparent',
  },
  template: '',
})
export class ZSkeletonComponent {}
