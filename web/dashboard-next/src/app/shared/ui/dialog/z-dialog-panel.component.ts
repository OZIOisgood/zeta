import { NgClass } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { NgpDialog, NgpDialogDescription, NgpDialogOverlay, NgpDialogTitle } from 'ng-primitives/dialog';
import { LucideAlertTriangle, LucideInfo, LucideTrash2 } from '@lucide/angular';
import { ZButtonComponent } from '../button/z-button.component';

type DialogTone = 'danger' | 'warning' | 'info';

@Component({
  selector: 'z-dialog-panel',
  imports: [
    NgClass,
    NgpDialog,
    NgpDialogDescription,
    NgpDialogOverlay,
    NgpDialogTitle,
    ZButtonComponent,
    LucideAlertTriangle,
    LucideInfo,
    LucideTrash2,
  ],
  template: `
    <div
      ngpDialogOverlay
      animate.enter="z-dialog-overlay-enter"
      animate.leave="z-dialog-overlay-leave"
      class="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4 backdrop-blur-sm"
    >
      <section
        ngpDialog
        [ngpDialogRole]="role()"
        [ngpDialogModal]="true"
        animate.enter="z-dialog-panel-enter"
        animate.leave="z-dialog-panel-leave"
        class="w-full max-w-md rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-2xl shadow-stone-950/15"
      >
        <div class="flex items-start gap-3">
          <div
            class="grid size-10 shrink-0 place-items-center rounded-md"
            [ngClass]="toneClasses()"
          >
            @switch (tone()) {
              @case ('danger') {
                <svg lucideTrash2 class="size-5" aria-hidden="true"></svg>
              }
              @case ('warning') {
                <svg lucideAlertTriangle class="size-5" aria-hidden="true"></svg>
              }
              @default {
                <svg lucideInfo class="size-5" aria-hidden="true"></svg>
              }
            }
          </div>

          <div class="min-w-0">
            <h2 ngpDialogTitle class="text-base font-semibold leading-6 text-[var(--z-text)]">
              {{ title() }}
            </h2>
            <p
              ngpDialogDescription
              class="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--z-muted)]"
            >
              {{ description() }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          @if (!confirmOnly()) {
            <z-button type="button" variant="secondary" (pressed)="close()(false)">
              {{ cancelLabel() }}
            </z-button>
          }
          <z-button type="button" [variant]="confirmVariant()" (pressed)="close()(true)">
            {{ confirmLabel() }}
          </z-button>
        </div>
      </section>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .z-dialog-overlay-enter {
      animation: z-dialog-overlay-in 120ms ease-out;
    }

    .z-dialog-overlay-leave {
      animation: z-dialog-overlay-out 100ms ease-in;
    }

    .z-dialog-panel-enter {
      animation: z-dialog-panel-in 140ms ease-out;
    }

    .z-dialog-panel-leave {
      animation: z-dialog-panel-out 100ms ease-in;
    }

    @keyframes z-dialog-overlay-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes z-dialog-overlay-out {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes z-dialog-panel-in {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes z-dialog-panel-out {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }
  `,
})
export class ZDialogPanelComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly close = input.required<(result?: boolean) => void>();
  readonly tone = input<DialogTone>('warning');
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input('');
  readonly confirmOnly = input(false);

  protected readonly role = computed(() => (this.tone() === 'info' ? 'dialog' : 'alertdialog'));
  protected readonly confirmVariant = computed(() => (this.tone() === 'danger' ? 'danger' : 'primary'));
  protected readonly toneClasses = computed(() => {
    switch (this.tone()) {
      case 'danger':
        return 'bg-rose-50 text-rose-700';
      case 'info':
        return 'bg-sky-50 text-sky-700';
      default:
        return 'bg-orange-50 text-[var(--z-primary)]';
    }
  });
}
