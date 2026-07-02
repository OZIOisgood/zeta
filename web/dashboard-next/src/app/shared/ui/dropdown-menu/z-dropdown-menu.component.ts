import { NgClass, NgTemplateOutlet } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  LucideChevronDown,
  LucideCircleHelp,
  LucideExternalLink,
  LucideFileText,
  LucideMail,
  LucideShield,
} from '@lucide/angular';
import { NgpMenu, NgpMenuItem, NgpMenuTrigger, type NgpMenuPlacement } from 'ng-primitives/menu';

export type ZDropdownMenuIcon = 'help' | 'file-text' | 'mail' | 'shield';

export type ZDropdownMenuItem = {
  id: string;
  label: string;
  href?: string;
  icon?: ZDropdownMenuIcon;
  disabled?: boolean;
  target?: '_self' | '_blank' | '_parent' | '_top';
  rel?: string;
};

@Component({
  selector: 'z-dropdown-menu',
  imports: [
    NgClass,
    NgTemplateOutlet,
    NgpMenu,
    NgpMenuItem,
    NgpMenuTrigger,
    LucideChevronDown,
    LucideCircleHelp,
    LucideExternalLink,
    LucideFileText,
    LucideMail,
    LucideShield,
  ],
  template: `
    <button
      type="button"
      class="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition hover:bg-[var(--z-surface-warm)] hover:text-[var(--z-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
      [ngClass]="triggerClass()"
      [attr.aria-label]="ariaLabel() || label()"
      [ngpMenuTrigger]="menu"
      [ngpMenuTriggerPlacement]="placement()"
      [ngpMenuTriggerOffset]="offset()"
      [ngpMenuTriggerFlip]="true"
      [ngpMenuTriggerShift]="{ padding: viewportPadding() }"
      ngpMenuTriggerScrollBehavior="reposition"
    >
      <ng-container [ngTemplateOutlet]="triggerIconTemplate" />
      <span class="min-w-0 flex-1 truncate">{{ label() }}</span>
      <svg lucideChevronDown class="size-4 shrink-0" aria-hidden="true"></svg>
    </button>

    <ng-template #triggerIconTemplate>
      @switch (triggerIcon()) {
        @case ('file-text') {
          <svg lucideFileText class="size-4 shrink-0" aria-hidden="true"></svg>
        }
        @case ('mail') {
          <svg lucideMail class="size-4 shrink-0" aria-hidden="true"></svg>
        }
        @case ('shield') {
          <svg lucideShield class="size-4 shrink-0" aria-hidden="true"></svg>
        }
        @default {
          <svg lucideCircleHelp class="size-4 shrink-0" aria-hidden="true"></svg>
        }
      }
    </ng-template>

    <ng-template #menu>
      <div
        ngpMenu
        class="z-50 rounded-md border border-[var(--z-border)] bg-white p-1 shadow-lg shadow-orange-950/10"
        [ngClass]="menuClass()"
      >
        @for (item of items(); track item.id) {
          @if (item.href) {
            <a
              ngpMenuItem
              class="flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold text-[var(--z-muted)] transition data-[active]:bg-[var(--z-surface-warm)] data-[active]:text-[var(--z-text)] hover:bg-[var(--z-surface-warm)] hover:text-[var(--z-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              [href]="item.disabled ? null : item.href"
              [target]="item.target || null"
              [rel]="item.rel || null"
              [ngpMenuItemDisabled]="item.disabled || false"
              [attr.aria-disabled]="item.disabled || null"
              (click)="select($event, item)"
            >
              <ng-container
                [ngTemplateOutlet]="itemIconTemplate"
                [ngTemplateOutletContext]="{ item }"
              />
              <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
              @if (showExternalIcon()) {
                <svg lucideExternalLink class="size-3.5 shrink-0" aria-hidden="true"></svg>
              }
            </a>
          } @else {
            <button
              ngpMenuItem
              type="button"
              class="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-semibold text-[var(--z-muted)] transition data-[active]:bg-[var(--z-surface-warm)] data-[active]:text-[var(--z-text)] hover:bg-[var(--z-surface-warm)] hover:text-[var(--z-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              [ngpMenuItemDisabled]="item.disabled || false"
              [disabled]="item.disabled || false"
              (click)="select($event, item)"
            >
              <ng-container
                [ngTemplateOutlet]="itemIconTemplate"
                [ngTemplateOutletContext]="{ item }"
              />
              <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            </button>
          }
        }
      </div>
    </ng-template>

    <ng-template #itemIconTemplate let-item="item">
      @switch (item.icon) {
        @case ('mail') {
          <svg lucideMail class="size-4 shrink-0" aria-hidden="true"></svg>
        }
        @case ('shield') {
          <svg lucideShield class="size-4 shrink-0" aria-hidden="true"></svg>
        }
        @case ('help') {
          <svg lucideCircleHelp class="size-4 shrink-0" aria-hidden="true"></svg>
        }
        @default {
          <svg lucideFileText class="size-4 shrink-0" aria-hidden="true"></svg>
        }
      }
    </ng-template>
  `,
  styles: `
    [ngpMenu] {
      position: absolute;
      box-sizing: border-box;
      transform-origin: var(--ngp-menu-transform-origin);
    }

    [ngpMenu][data-enter] {
      animation: z-dropdown-menu-show 100ms ease-out;
    }

    [ngpMenu][data-exit] {
      animation: z-dropdown-menu-hide 100ms ease-in;
    }

    @keyframes z-dropdown-menu-show {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes z-dropdown-menu-hide {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
      }
    }
  `,
})
export class ZDropdownMenuComponent {
  readonly label = input.required<string>();
  readonly items = input.required<ZDropdownMenuItem[]>();
  readonly ariaLabel = input('');
  readonly triggerIcon = input<ZDropdownMenuIcon>('help');
  readonly triggerClass = input('text-[var(--z-muted)]');
  readonly menuClass = input('w-56');
  readonly placement = input<NgpMenuPlacement>('bottom-start');
  readonly offset = input(8);
  readonly viewportPadding = input(8);
  readonly showExternalIcon = input(true);
  readonly itemSelected = output<ZDropdownMenuItem>();

  protected select(event: MouseEvent, item: ZDropdownMenuItem): void {
    if (item.disabled) {
      event.preventDefault();
      return;
    }

    this.itemSelected.emit(item);
  }
}
