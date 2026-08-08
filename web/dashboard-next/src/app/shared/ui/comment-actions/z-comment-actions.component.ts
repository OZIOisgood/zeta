import { Component, HostListener, input, output, signal } from '@angular/core';
import { NgpDialogTrigger } from 'ng-primitives/dialog';
import { LucideEllipsis, LucideFlag, LucidePencil, LucideTrash } from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { ZConfirmDialogComponent } from '../dialog/z-confirm-dialog.component';

/**
 * Kebab-menu for comment actions (edit + delete).
 *
 * Desktop: button hidden until `group-hover`, opens a small popover.
 * Mobile (`hover: none`): button always visible, opens a bottom-sheet.
 *
 * Delete confirmation is self-contained (dialog inside the component).
 * The `delete` output fires only after the user confirms.
 *
 * Usage:
 *   <div class="group …">
 *     …
 *     <z-comment-actions
 *       [canEdit]="canEdit()"
 *       [canDelete]="canDelete()"
 *       (edit)="startEditing(id, content)"
 *       (delete)="doDeleteReview(id)"
 *     />
 *   </div>
 */
@Component({
  selector: 'z-comment-actions',
  imports: [
    NgpDialogTrigger,
    TranslocoPipe,
    ZConfirmDialogComponent,
    LucideEllipsis,
    LucideFlag,
    LucidePencil,
    LucideTrash,
  ],
  template: `
    <div class="relative self-start">
      <!-- Trigger button: hidden on desktop until hover/focus; always visible on touch -->
      <button
        type="button"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="'common.actions.more' | transloco"
        class="grid size-8 place-items-center rounded-md text-[var(--z-muted)] opacity-0 transition-opacity
               hover:bg-[var(--z-surface-warm)] hover:text-[var(--z-text)]
               focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2
               focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]
               group-hover:opacity-100 group-focus-within:opacity-100
               [@media(hover:none)]:opacity-100"
        [class.!opacity-100]="open()"
        (click)="open.set(!open())"
      >
        <svg lucideEllipsis class="size-4" aria-hidden="true"></svg>
      </button>

      @if (open()) {
        <!-- Scrim: closes on outside-click; dims sheet on mobile, transparent on desktop -->
        <div
          class="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
          (click)="open.set(false)"
        ></div>

        <!-- Bottom-sheet on mobile → popover on sm+ -->
        <div
          role="menu"
          class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-[var(--z-border)]
                 bg-white p-2 pb-[max(8px,env(safe-area-inset-bottom))] shadow-lg
                 sm:absolute sm:inset-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+4px)]
                 sm:w-44 sm:rounded-lg sm:border sm:pb-2 sm:shadow-md"
        >
          @if (canEdit()) {
            <button
              type="button"
              role="menuitem"
              class="flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-left
                     text-sm font-semibold text-[var(--z-text)]
                     hover:bg-[var(--z-surface-warm)] sm:min-h-9"
              (click)="onEdit()"
            >
              <svg lucidePencil class="size-4" aria-hidden="true"></svg>
              {{ 'common.actions.edit' | transloco }}
            </button>
          }

          @if (canDelete()) {
            <ng-template #confirmDeleteDialog let-close="close">
              <z-confirm-dialog
                [title]="'videos.deleteComment' | transloco"
                [description]="'videos.confirmDeleteComment' | transloco"
                tone="danger"
                [confirmLabel]="'common.actions.delete' | transloco"
                [cancelLabel]="'common.actions.cancel' | transloco"
                [close]="close"
              />
            </ng-template>
            <button
              type="button"
              role="menuitem"
              class="flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-left
                     text-sm font-semibold text-[var(--z-danger)]
                     hover:bg-red-50 sm:min-h-9"
              [ngpDialogTrigger]="confirmDeleteDialog"
              (ngpDialogTriggerClosed)="onDelete($event)"
            >
              <svg lucideTrash class="size-4" aria-hidden="true"></svg>
              {{ 'common.actions.delete' | transloco }}
            </button>
          }

          @if (canReport()) {
            <button
              type="button"
              role="menuitem"
              class="flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-left
                     text-sm font-semibold text-[var(--z-text)]
                     hover:bg-[var(--z-surface-warm)] sm:min-h-9"
              (click)="onReport()"
            >
              <svg lucideFlag class="size-4" aria-hidden="true"></svg>
              {{ 'common.actions.report' | transloco }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ZCommentActionsComponent {
  readonly canEdit = input(true);
  readonly canDelete = input(true);
  readonly canReport = input(false);
  readonly edit = output<void>();
  readonly delete = output<void>();
  readonly report = output<void>();

  protected readonly open = signal(false);

  @HostListener('document:keydown.escape')
  protected onEsc(): void {
    this.open.set(false);
  }

  protected onEdit(): void {
    this.open.set(false);
    this.edit.emit();
  }

  protected onDelete(result: unknown): void {
    this.open.set(false);
    if (result === true) this.delete.emit();
  }

  protected onReport(): void {
    this.open.set(false);
    this.report.emit();
  }
}
