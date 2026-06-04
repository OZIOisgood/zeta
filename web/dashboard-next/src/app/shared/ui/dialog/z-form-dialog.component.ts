import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { NgpDialog, NgpDialogOverlay, NgpDialogTitle } from 'ng-primitives/dialog';
import { ZButtonComponent } from '../button/z-button.component';

@Component({
  selector: 'z-form-dialog',
  imports: [TranslocoPipe, NgpDialog, NgpDialogOverlay, NgpDialogTitle, ZButtonComponent],
  template: `
    <div
      ngpDialogOverlay
      animate.enter="z-dialog-overlay-enter"
      animate.leave="z-dialog-overlay-leave"
      class="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4 backdrop-blur-sm"
    >
      <section
        ngpDialog
        [ngpDialogModal]="true"
        animate.enter="z-dialog-panel-enter"
        animate.leave="z-dialog-panel-leave"
        class="w-full max-w-md rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-2xl shadow-stone-950/15"
      >
        <h2 ngpDialogTitle class="text-base font-semibold">{{ title() }}</h2>
        <div class="mt-4 grid gap-4">
          <ng-content />
        </div>
        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <z-button type="button" variant="secondary" (pressed)="cancelled.emit()">
            {{ 'common.actions.cancel' | transloco }}
          </z-button>
          <z-button type="button" (pressed)="saved.emit()">
            {{ 'common.actions.save' | transloco }}
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
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes z-dialog-overlay-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes z-dialog-panel-in {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes z-dialog-panel-out {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(8px) scale(0.98); }
    }
  `,
})
export class ZFormDialogComponent {
  readonly title = input.required<string>();
  readonly cancelled = output<void>();
  readonly saved = output<void>();
}
