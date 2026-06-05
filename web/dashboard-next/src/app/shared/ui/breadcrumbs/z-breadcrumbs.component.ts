import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronRight } from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';

export type BreadcrumbItem = {
  label: string;
  routerLink?: string | any[];
  translate?: boolean;
};

@Component({
  selector: 'z-breadcrumbs',
  imports: [RouterLink, TranslocoPipe, LucideChevronRight],
  template: `
    <nav aria-label="Breadcrumb">
      <ol class="flex min-w-0 flex-wrap items-center gap-1 text-sm">
        @for (item of items(); track item.label; let last = $last) {
          <li class="flex min-w-0 items-center gap-1">
            @if (item.routerLink && !last) {
              <a
                [routerLink]="item.routerLink"
                class="truncate rounded-sm px-1 font-semibold text-[var(--z-muted)] transition hover:text-[var(--z-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--z-primary)]"
              >
                @if (item.translate === false) {
                  {{ item.label }}
                } @else {
                  {{ item.label | transloco }}
                }
              </a>
            } @else {
              <span
                [class]="
                  last
                    ? 'truncate px-1 font-semibold text-[var(--z-text)]'
                    : 'truncate px-1 font-semibold text-[var(--z-muted)]'
                "
                [attr.aria-current]="last ? 'page' : null"
              >
                @if (item.translate === false) {
                  {{ item.label }}
                } @else {
                  {{ item.label | transloco }}
                }
              </span>
            }

            @if (!last) {
              <svg
                lucideChevronRight
                class="size-4 shrink-0 text-[var(--z-muted)]"
                aria-hidden="true"
              ></svg>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class ZBreadcrumbsComponent {
  readonly items = input.required<BreadcrumbItem[]>();
}
