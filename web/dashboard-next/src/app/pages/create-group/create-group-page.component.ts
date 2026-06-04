import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { GroupsStore } from '../../features/groups/groups.store';
import { ZAvatarInputComponent } from '../../shared/ui/avatar-input/z-avatar-input.component';
import { ZBreadcrumbsComponent } from '../../shared/ui/breadcrumbs/z-breadcrumbs.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZFieldErrorComponent } from '../../shared/ui/field-error/z-field-error.component';
import { ZFieldLabelComponent } from '../../shared/ui/field-label/z-field-label.component';
import { ZTextInputComponent } from '../../shared/ui/text-input/z-text-input.component';
import { ZTextareaComponent } from '../../shared/ui/textarea/z-textarea.component';

@Component({
  selector: 'app-create-group-page',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    ZAvatarInputComponent,
    ZBreadcrumbsComponent,
    ZButtonComponent,
    ZFieldErrorComponent,
    ZFieldLabelComponent,
    ZTextInputComponent,
    ZTextareaComponent,
  ],
  template: `
    <div class="mx-auto grid max-w-2xl gap-5">
      <z-breadcrumbs
        [items]="[
          { label: 'common.nav.groups', routerLink: '/groups' },
          { label: 'groups.create', translate: true },
        ]"
      />

      <form
        class="grid gap-5 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm"
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
          <z-field-label [label]="'groups.groupName' | transloco" [control]="form.controls.name" />
          <z-text-input
            formControlName="name"
            [placeholder]="'groups.namePlaceholder' | transloco"
            ariaDescribedBy="create-group-name-error"
            [invalid]="
              (form.controls.name.dirty || form.controls.name.touched) && form.controls.name.invalid
            "
          />
          @if (
            (form.controls.name.dirty || form.controls.name.touched) && form.controls.name.invalid
          ) {
            <z-field-error
              id="create-group-name-error"
              [message]="'groups.groupNameRequired' | transloco"
            />
          }
        </label>

        <label class="grid gap-2">
          <z-field-label
            [label]="'common.fields.description' | transloco"
            [control]="form.controls.description"
          />
          <z-textarea
            formControlName="description"
            [placeholder]="'groups.descriptionPlaceholder' | transloco"
          />
        </label>

        <z-avatar-input
          formControlName="avatar"
          [label]="'common.fields.avatar' | transloco"
          [helperTitle]="'groups.avatarTitle' | transloco"
          [helperText]="'avatar.requirement' | transloco"
          [previewLabel]="'common.aria.avatarPreview' | transloco"
          [selectLabel]="'avatar.selectImage' | transloco"
          [invalidImageMessage]="'avatar.invalidImage' | transloco"
          [sizeExceededMessage]="'avatar.sizeExceeded' | transloco"
          [loadFailedMessage]="'avatar.loadFailed' | transloco"
          [readFailedMessage]="'avatar.readFailed' | transloco"
          [errorMessage]="
            form.controls.avatar.touched && form.controls.avatar.invalid
              ? ('groups.avatarRequired' | transloco)
              : null
          "
          [required]="true"
          [disabled]="store.mutationStatus() === 'loading'"
        />

        @if (store.mutationStatus() === 'error') {
          <p class="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {{ store.mutationError() }}
          </p>
        }

        <div class="flex justify-end gap-2">
          <z-button variant="secondary" type="button" (pressed)="router.navigate(['/groups'])">
            {{ 'common.actions.cancel' | transloco }}
          </z-button>
          <z-button type="submit" [disabled]="store.mutationStatus() === 'loading'">
            {{
              store.mutationStatus() === 'loading'
                ? ('groups.creating' | transloco)
                : ('common.actions.create' | transloco)
            }}
          </z-button>
        </div>
      </form>
    </div>
  `,
})
export class CreateGroupPageComponent {
  protected readonly store = inject(GroupsStore);
  protected readonly router = inject(Router);
  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    description: new FormControl('', { nonNullable: true }),
    avatar: new FormControl<string | null>(null, { validators: [Validators.required] }),
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    if (!formValue.avatar) {
      this.form.controls.avatar.markAsTouched();
      return;
    }

    const group = await this.store.createGroup({
      name: formValue.name.trim(),
      description: formValue.description.trim() || undefined,
      avatar: formValue.avatar,
    });
    if (group) {
      await this.router.navigate(['/groups', group.id]);
    }
  }
}
