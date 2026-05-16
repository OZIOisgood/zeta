import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { GroupsStore } from '../../features/groups/groups.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';

@Component({
  selector: 'app-group-preferences-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    ZBadgeComponent,
    ZButtonComponent,
    ZSkeletonComponent,
    LucideArrowLeft,
  ],
  template: `
    <div class="mx-auto grid max-w-2xl gap-5">
      <a
        [routerLink]="['/groups', groupId]"
        class="inline-flex items-center gap-2 text-sm font-semibold text-[var(--z-muted)] hover:text-[var(--z-text)]"
      >
        <svg lucideArrowLeft class="size-4" aria-hidden="true"></svg>
        <span>{{ 'common.actions.back' | transloco }}</span>
      </a>

      @if (store.detailStatus() === 'loading') {
        <z-skeleton class="block h-96 w-full"></z-skeleton>
      } @else {
        <form
          class="grid gap-5 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm"
          [formGroup]="form"
          (ngSubmit)="submit()"
        >
          <div>
            <z-badge tone="primary">{{ 'groups.preferences' | transloco }}</z-badge>
            <h2 class="mt-3 text-2xl font-semibold">{{ 'groups.preferences' | transloco }}</h2>
            <p class="mt-2 text-sm leading-6 text-[var(--z-muted)]">
              {{ 'groups.phase4.preferencesSummary' | transloco }}
            </p>
          </div>

          <label class="grid gap-2">
            <span class="text-sm font-semibold">{{ 'groups.groupName' | transloco }}</span>
            <input
              class="min-h-11 rounded-md border border-[var(--z-border)] bg-white px-3 text-sm outline-none transition focus:border-[var(--z-primary)] focus:ring-2 focus:ring-orange-100"
              formControlName="name"
              type="text"
            />
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-semibold">{{ 'common.fields.description' | transloco }}</span>
            <textarea
              class="min-h-28 rounded-md border border-[var(--z-border)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--z-primary)] focus:ring-2 focus:ring-orange-100"
              formControlName="description"
            ></textarea>
          </label>

          @if (store.mutationStatus() === 'error') {
            <p class="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {{ store.mutationError() }}
            </p>
          }
          @if (store.mutationStatus() === 'success') {
            <p class="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {{ 'groups.updated' | transloco }}
            </p>
          }

          <div class="flex justify-end">
            <z-button
              type="submit"
              [disabled]="form.invalid || store.mutationStatus() === 'loading'"
            >
              {{ 'common.actions.save' | transloco }}
            </z-button>
          </div>
        </form>
      }
    </div>
  `,
})
export class GroupPreferencesPageComponent {
  protected readonly store = inject(GroupsStore);
  protected groupId = '';
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe(async (params) => {
        this.groupId = params.get('id') ?? '';
        if (!this.groupId) {
          return;
        }

        await this.store.loadGroup(this.groupId);
        const group = this.store.activeGroup();
        if (group) {
          this.form.patchValue({
            name: group.name,
            description: group.description ?? '',
          });
        }
      });
  }

  protected async submit(): Promise<void> {
    if (!this.groupId || this.form.invalid) {
      return;
    }

    await this.store.updateGroup(this.groupId, this.form.getRawValue());
  }
}
