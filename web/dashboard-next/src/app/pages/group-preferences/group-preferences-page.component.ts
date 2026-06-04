import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideImage, LucideTriangleAlert, LucideTrash2 } from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { NgpDialogTrigger } from 'ng-primitives/dialog';
import { SessionStore } from '../../features/session/session.store';
import { GroupsStore } from '../../features/groups/groups.store';
import { ZAvatarInputComponent } from '../../shared/ui/avatar-input/z-avatar-input.component';
import { ZBreadcrumbsComponent } from '../../shared/ui/breadcrumbs/z-breadcrumbs.component';
import { ZButtonComponent } from '../../shared/ui/button/z-button.component';
import { ZDialogPanelComponent } from '../../shared/ui/dialog/z-dialog-panel.component';
import { ZFieldErrorComponent } from '../../shared/ui/field-error/z-field-error.component';
import { ZFieldLabelComponent } from '../../shared/ui/field-label/z-field-label.component';
import { ZSkeletonComponent } from '../../shared/ui/skeleton/z-skeleton.component';
import { ZTabPanelComponent } from '../../shared/ui/tabs/z-tab-panel.component';
import { ZTabsComponent } from '../../shared/ui/tabs/z-tabs.component';
import { ZTextInputComponent } from '../../shared/ui/text-input/z-text-input.component';
import { ZTextareaComponent } from '../../shared/ui/textarea/z-textarea.component';

type GroupPreferencesTab = 'general' | 'delete';
type GroupPreferencesFormValue = {
  name: string;
  description: string;
  avatar: string | null;
};

@Component({
  selector: 'app-group-preferences-page',
  imports: [
    ReactiveFormsModule,
    NgpDialogTrigger,
    TranslocoPipe,
    ZAvatarInputComponent,
    ZBreadcrumbsComponent,
    ZButtonComponent,
    ZDialogPanelComponent,
    ZFieldErrorComponent,
    ZFieldLabelComponent,
    ZSkeletonComponent,
    ZTabPanelComponent,
    ZTabsComponent,
    ZTextInputComponent,
    ZTextareaComponent,
    LucideImage,
    LucideTriangleAlert,
    LucideTrash2,
  ],
  template: `
    <div class="mx-auto grid max-w-3xl gap-5">
      <z-breadcrumbs
        [items]="[
          { label: 'common.nav.groups', routerLink: '/groups' },
          {
            label: store.activeGroup()?.name || '...',
            routerLink: groupId ? ['/groups', groupId] : undefined,
            translate: false,
          },
          { label: 'common.actions.preferences' },
        ]"
      />

      <section class="rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm">
        <h1 class="text-2xl font-semibold sm:text-3xl">{{ 'groups.preferences' | transloco }}</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--z-muted)]">
          {{ 'groups.phase4.preferencesSummary' | transloco }}
        </p>
      </section>

      @if (store.detailStatus() === 'loading') {
        <z-skeleton class="block h-96 w-full"></z-skeleton>
      } @else {
        <div class="grid gap-4">
          <z-tabs
            tabsId="group-preferences-tabs"
            [label]="'groups.preferences' | transloco"
            [value]="activeTab()"
            [options]="[
              { value: 'general', label: ('groups.generalTab' | transloco) },
              { value: 'delete', label: ('groups.deleteTab' | transloco) },
            ]"
            (valueChange)="selectTab($event)"
          />

          @if (activeTab() === 'general') {
            <z-tab-panel tabsId="group-preferences-tabs" value="general">
              <form
                class="grid gap-5 rounded-lg border border-[var(--z-border)] bg-white p-5 shadow-sm"
                [formGroup]="form"
                (ngSubmit)="submit()"
              >
                <div class="flex items-start gap-3 border-b border-[var(--z-border)] pb-4">
                  <span
                    class="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--z-surface-warm)] text-[var(--z-primary)]"
                  >
                    <svg lucideImage class="size-5" aria-hidden="true"></svg>
                  </span>
                  <div>
                    <h2 class="text-base font-semibold">{{ 'groups.generalTab' | transloco }}</h2>
                    <p class="mt-1 text-sm leading-5 text-[var(--z-muted)]">
                      {{ 'groups.phase4.preferencesSummary' | transloco }}
                    </p>
                  </div>
                </div>
                <label class="grid gap-2">
                  <z-field-label
                    [label]="'groups.groupName' | transloco"
                    [control]="form.controls.name"
                  />
                  <z-text-input
                    formControlName="name"
                    [placeholder]="'groups.namePlaceholder' | transloco"
                    ariaDescribedBy="group-preferences-name-error"
                    [invalid]="
                      (form.controls.name.dirty || form.controls.name.touched) &&
                      form.controls.name.invalid
                    "
                  />
                  @if (
                    (form.controls.name.dirty || form.controls.name.touched) &&
                    form.controls.name.invalid
                  ) {
                    <z-field-error
                      id="group-preferences-name-error"
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
                  [disabled]="store.mutationStatus() === 'loading'"
                />

                @if (store.mutationStatus() === 'error' && activeMutation() === 'general') {
                  <p class="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                    {{ store.mutationError() }}
                  </p>
                }
                @if (saveSucceeded()) {
                  <p
                    class="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                  >
                    {{ 'groups.updated' | transloco }}
                  </p>
                }

                <div class="flex justify-end">
                  <z-button
                    type="submit"
                    [disabled]="
                      form.invalid || !hasFormChanges() || store.mutationStatus() === 'loading'
                    "
                  >
                    {{ 'common.actions.save' | transloco }}
                  </z-button>
                </div>
              </form>
            </z-tab-panel>
          } @else {
            <z-tab-panel tabsId="group-preferences-tabs" value="delete">
              <div class="grid gap-5 rounded-lg border border-rose-200 bg-white p-5 shadow-sm">
                <div class="flex items-start gap-3 border-b border-rose-200 pb-4">
                  <span
                    class="grid size-10 shrink-0 place-items-center rounded-md bg-rose-50 text-rose-700"
                  >
                    <svg lucideTriangleAlert class="size-5" aria-hidden="true"></svg>
                  </span>
                  <div>
                    <h2 class="text-base font-semibold text-[var(--z-text)]">
                      {{ 'groups.deleteGroup' | transloco }}
                    </h2>
                    <p class="mt-1 text-sm leading-5 text-[var(--z-muted)]">
                      {{ 'groups.deleteDescription' | transloco }}
                    </p>
                  </div>
                </div>

                @if (store.mutationStatus() === 'error' && activeMutation() === 'delete') {
                  <p class="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                    {{ store.mutationError() }}
                  </p>
                }

                @if (canDeleteGroup()) {
                  <ng-template #deleteGroupDialog let-close="close">
                    <z-dialog-panel
                      [title]="'groups.deleteGroup' | transloco"
                      [description]="'groups.deleteConfirm' | transloco"
                      tone="danger"
                      [confirmLabel]="'groups.deleteGroup' | transloco"
                      [cancelLabel]="'common.actions.cancel' | transloco"
                      [close]="close"
                    />
                  </ng-template>
                  <div
                    class="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 class="text-sm font-semibold text-rose-950">
                        {{ 'groups.deleteThisGroup' | transloco }}
                      </h3>
                      <p class="mt-1 text-sm leading-6 text-rose-800">
                        {{ 'groups.deleteSummary' | transloco }}
                      </p>
                    </div>
                    <z-button
                      variant="danger"
                      type="button"
                      [disabled]="store.mutationStatus() === 'loading'"
                      [ngpDialogTrigger]="deleteGroupDialog"
                      (ngpDialogTriggerClosed)="confirmDelete($event)"
                    >
                      <svg lucideTrash2 class="size-4" aria-hidden="true"></svg>
                      <span>{{ 'groups.deleteGroup' | transloco }}</span>
                    </z-button>
                  </div>
                } @else {
                  <p
                    class="rounded-md border border-[var(--z-border)] bg-[var(--z-bg)] p-4 text-sm leading-6 text-[var(--z-muted)]"
                  >
                    {{ 'groups.deleteUnavailable' | transloco }}
                  </p>
                }
              </div>
            </z-tab-panel>
          }
        </div>
      }
    </div>
  `,
})
export class GroupPreferencesPageComponent {
  protected readonly store = inject(GroupsStore);
  protected readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected groupId = '';
  protected readonly activeTab = signal<GroupPreferencesTab>('general');
  protected readonly activeMutation = signal<GroupPreferencesTab | null>(null);
  protected readonly saveSucceeded = signal(false);
  private readonly formRevision = signal(0);
  private readonly initialFormValue = signal<GroupPreferencesFormValue | null>(null);
  private initializedGroupId = '';
  protected readonly canDeleteGroup = computed(() => {
    const group = this.store.activeGroup();
    const user = this.session.user();

    return (
      !!group && !!user && group.owner_id === user.id && this.session.hasPermission('groups:delete')
    );
  });
  protected readonly hasFormChanges = computed(() => {
    this.formRevision();
    const initialValue = this.initialFormValue();

    return !!initialValue && !this.sameFormValue(this.currentFormValue(), initialValue);
  });
  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    description: new FormControl('', { nonNullable: true }),
    avatar: new FormControl<string | null>(null),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.saveSucceeded.set(false);
      this.formRevision.update((revision) => revision + 1);
    });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(async (params) => {
      this.groupId = params.get('id') ?? '';
      const tab = this.normalizeTab(params.get('tab'));
      this.activeTab.set(tab);

      if (!this.groupId) {
        return;
      }

      if (this.store.activeGroup()?.id !== this.groupId) {
        await this.store.loadGroup(this.groupId);
      }

      this.saveSucceeded.set(false);
      this.activeMutation.set(null);
      const group = this.store.activeGroup();
      if (group && this.initializedGroupId !== group.id) {
        const formValue = {
          name: group.name,
          description: group.description ?? '',
          avatar: group.avatar,
        };
        this.form.patchValue(formValue, { emitEvent: false });
        this.initialFormValue.set(this.normalizeFormValue(formValue));
        this.formRevision.update((revision) => revision + 1);
        this.initializedGroupId = group.id;
      }
    });
  }

  protected selectTab(value: string | undefined): void {
    const tab = this.normalizeTab(value);
    if (!this.groupId || tab === this.activeTab()) {
      return;
    }

    void this.router.navigate(['/groups', this.groupId, 'preferences', tab]);
  }

  protected async submit(): Promise<void> {
    if (!this.groupId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    this.activeMutation.set('general');
    const group = await this.store.updateGroup(this.groupId, {
      name: formValue.name.trim(),
      description: formValue.description.trim() || undefined,
      avatar: formValue.avatar ?? undefined,
    });

    this.saveSucceeded.set(!!group);
    if (group) {
      const nextValue = this.currentFormValue();
      this.initialFormValue.set(nextValue);
      this.formRevision.update((revision) => revision + 1);
    }
  }

  protected async confirmDelete(result: unknown): Promise<void> {
    if (result !== true || !this.groupId || !this.canDeleteGroup()) {
      return;
    }

    this.activeMutation.set('delete');
    const deleted = await this.store.deleteGroup(this.groupId);
    if (deleted) {
      await this.router.navigate(['/groups']);
    }
  }

  private normalizeTab(value: string | null | undefined): GroupPreferencesTab {
    return value === 'delete' ? 'delete' : 'general';
  }

  private currentFormValue(): GroupPreferencesFormValue {
    return this.normalizeFormValue(this.form.getRawValue());
  }

  private normalizeFormValue(value: GroupPreferencesFormValue): GroupPreferencesFormValue {
    return {
      name: value.name.trim(),
      description: value.description.trim(),
      avatar: value.avatar ?? null,
    };
  }

  private sameFormValue(
    left: GroupPreferencesFormValue,
    right: GroupPreferencesFormValue,
  ): boolean {
    return (
      left.name === right.name &&
      left.description === right.description &&
      left.avatar === right.avatar
    );
  }
}
