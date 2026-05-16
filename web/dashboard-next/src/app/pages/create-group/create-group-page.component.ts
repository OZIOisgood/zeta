import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { GroupsStore } from '../../features/groups/groups.store';
import { ZBadgeComponent } from '../../shared/ui/badge/z-badge.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';

@Component({
  selector: 'app-create-group-page',
  imports: [ReactiveFormsModule, TranslocoPipe, ZBadgeComponent, ZButtonComponent],
  template: `
    <form
      class="mx-auto grid max-w-2xl gap-5 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm"
      [formGroup]="form"
      (ngSubmit)="submit()"
    >
      <div>
        <z-badge tone="primary">{{ 'groups.create' | transloco }}</z-badge>
        <h2 class="mt-3 text-2xl font-semibold">{{ 'groups.createNew' | transloco }}</h2>
        <p class="mt-2 text-sm leading-6 text-[var(--z-muted)]">
          {{ 'groups.createFirstDescription' | transloco }}
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

      <div class="flex justify-end gap-2">
        <z-button variant="secondary" type="button" (pressed)="router.navigate(['/groups'])">
          {{ 'common.actions.cancel' | transloco }}
        </z-button>
        <z-button type="submit" [disabled]="form.invalid || store.mutationStatus() === 'loading'">
          {{
            store.mutationStatus() === 'loading'
              ? ('groups.creating' | transloco)
              : ('common.actions.create' | transloco)
          }}
        </z-button>
      </div>
    </form>
  `,
})
export class CreateGroupPageComponent {
  protected readonly store = inject(GroupsStore);
  protected readonly router = inject(Router);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    const group = await this.store.createGroup(this.form.getRawValue());
    if (group) {
      await this.router.navigate(['/groups', group.id]);
    }
  }
}
