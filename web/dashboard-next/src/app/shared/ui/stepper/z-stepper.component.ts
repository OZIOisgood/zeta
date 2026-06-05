import { NgClass } from '@angular/common';
import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { LucideCheck } from '@lucide/angular';

export type StepState = 'completed' | 'active' | 'upcoming';

export type StepperStep = {
  label: string;
  state: StepState;
};

@Component({
  selector: 'z-stepper',
  imports: [NgClass, LucideCheck],
  template: `
    <div class="z-stepper-scroll overflow-x-auto overscroll-x-contain pb-1">
      <nav class="flex min-w-max items-start px-1 sm:min-w-full" [attr.aria-label]="label()">
        @for (step of steps(); track $index) {
          @if ($index > 0) {
            <!-- connector line — pt-4 aligns vertically with the centre of the size-8 circle -->
            <div class="w-10 flex-none px-1 pt-4 sm:flex-1 sm:px-2">
              <div
                class="h-0.5 w-full rounded-full transition-colors"
                [ngClass]="
                  step.state !== 'upcoming' ? 'bg-[var(--z-primary)]' : 'bg-[var(--z-border)]'
                "
              ></div>
            </div>
          }

          <div #stepItem class="flex w-20 shrink-0 scroll-mx-6 flex-col items-center gap-1.5">
            <button
              type="button"
              class="grid size-8 place-items-center rounded-full border-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
              [ngClass]="circleClasses(step.state)"
              [disabled]="step.state === 'upcoming'"
              [attr.aria-current]="step.state === 'active' ? 'step' : null"
              (click)="stepClick.emit($index)"
            >
              @if (step.state === 'completed') {
                <svg lucideCheck class="size-4" aria-hidden="true"></svg>
              } @else {
                {{ $index + 1 }}
              }
            </button>

            <span
              class="w-full text-center text-xs leading-tight transition-colors"
              [ngClass]="labelClasses(step.state)"
              >{{ step.label }}</span
            >
          </div>
        }
      </nav>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
    }

    .z-stepper-scroll {
      width: 100%;
      max-width: 100%;
      scrollbar-width: none;
      scroll-padding-inline: 1.5rem;
    }

    .z-stepper-scroll::-webkit-scrollbar {
      display: none;
    }
  `,
})
export class ZStepperComponent {
  readonly label = input('Steps');
  readonly steps = input.required<StepperStep[]>();
  readonly stepClick = output<number>();
  private readonly stepItems = viewChildren<ElementRef<HTMLElement>>('stepItem');
  private readonly activeIndex = computed(() => {
    const index = this.steps().findIndex((step) => step.state === 'active');
    return index === -1 ? 0 : index;
  });

  constructor() {
    effect(() => {
      const activeItem = this.stepItems()[this.activeIndex()]?.nativeElement;
      if (!activeItem || typeof activeItem.scrollIntoView !== 'function') return;

      queueMicrotask(() => {
        activeItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      });
    });
  }

  protected circleClasses(state: StepState): string {
    if (state === 'completed') {
      return 'border-[var(--z-primary)] bg-[var(--z-primary)] text-white cursor-pointer hover:bg-[var(--z-primary-strong)]';
    }
    if (state === 'active') {
      return 'border-[var(--z-primary)] bg-white text-[var(--z-primary)] cursor-default';
    }
    return 'border-[var(--z-border)] bg-white text-[var(--z-muted)] cursor-not-allowed opacity-50';
  }

  protected labelClasses(state: StepState): string {
    if (state === 'active') return 'font-semibold text-[var(--z-text)]';
    if (state === 'completed') return 'text-[var(--z-primary)]';
    return 'text-[var(--z-muted)]';
  }
}
