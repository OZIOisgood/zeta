import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { GroupsStore } from '../../features/groups/groups.store';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZTextInputComponent } from '../../shared/ui/text-input/z-text-input.component';
import { ZTextareaComponent } from '../../shared/ui/textarea/z-textarea.component';

@Component({
  selector: 'app-create-group-page',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    ZButtonComponent,
    ZTextInputComponent,
    ZTextareaComponent,
  ],
  template: `
    <form
      class="mx-auto grid max-w-2xl gap-5 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm"
      [formGroup]="form"
      (ngSubmit)="submit()"
    >
      <div>
        <h2 class="text-2xl font-semibold">{{ 'groups.createNew' | transloco }}</h2>
        <p class="mt-2 text-sm leading-6 text-[var(--z-muted)]">
          {{ 'groups.createFirstDescription' | transloco }}
        </p>
      </div>

      <label class="grid gap-2">
        <span class="text-sm font-semibold">{{ 'groups.groupName' | transloco }}</span>
        <z-text-input formControlName="name" [placeholder]="'groups.namePlaceholder' | transloco" />
      </label>

      <label class="grid gap-2">
        <span class="text-sm font-semibold">{{ 'common.fields.description' | transloco }}</span>
        <z-textarea
          formControlName="description"
          [placeholder]="'groups.descriptionPlaceholder' | transloco"
        />
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
