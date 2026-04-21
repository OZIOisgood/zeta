import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  TuiAlertService,
  TuiButton,
  TuiDialogService,
  TuiLabel,
  TuiTextfield,
} from '@taiga-ui/core';
import { TUI_CONFIRM, TuiSkeleton, TuiTabs, TuiTextarea, type TuiConfirmData } from '@taiga-ui/kit';
import { filter, map, switchMap, take } from 'rxjs';
import { AvatarSelectorComponent } from '../../shared/components/avatar-selector/avatar-selector.component';
import { BreadcrumbsComponent } from '../../shared/components/breadcrumbs/breadcrumbs.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { AuthService } from '../../shared/services/auth.service';
import { Group, GroupsService } from '../../shared/services/groups.service';

@Component({
  selector: 'app-group-preferences-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageContainerComponent,
    BreadcrumbsComponent,
    SectionHeaderComponent,
    TuiTabs,
    TuiSkeleton,
    TuiButton,
    TuiLabel,
    TuiTextfield,
    TuiTextarea,
    AvatarSelectorComponent,
  ],
  templateUrl: './group-preferences-page.component.html',
  styleUrls: ['./group-preferences-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupPreferencesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupsService = inject(GroupsService);
  private readonly auth = inject(AuthService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly alerts = inject(TuiAlertService);

  protected readonly group = signal<Group | null>(null);
  protected readonly loading = signal(true);
  protected readonly activeTabIndex = signal(0);

  protected readonly isOwner = computed(() => {
    const group = this.group();
    return group ? this.auth.user()?.id === group.owner_id : false;
  });

  protected readonly breadcrumbs = computed(() => {
    const group = this.group();
    return [
      { label: 'Groups', routerLink: '/groups' },
      { label: group?.name ?? '...', routerLink: group ? `/groups/${group.id}` : undefined },
      { label: 'Preferences' },
    ];
  });

  protected readonly form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    description: new FormControl(''),
  });

  protected isSubmitting = false;
  protected isDeleting = false;
  protected newAvatarBase64: string | null = null;
  protected avatarChanged = false;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((p) => p.get('id')),
        filter((id): id is string => !!id),
        switchMap((id) => this.groupsService.get(id)),
        take(1),
      )
      .subscribe({
        next: (group) => {
          this.group.set(group);
          this.loading.set(false);
          this.form.patchValue({
            name: group.name,
            description: group.description || '',
          });
          this.form.markAsPristine();
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  protected getInitialAvatar(): string | null {
    const avatar = this.group()?.avatar;
    if (!avatar) return null;
    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  }

  protected onAvatarChange(base64: string | null): void {
    this.newAvatarBase64 = base64 ? base64.split(',')[1] || base64 : null;
    this.avatarChanged = true;
  }

  protected get isSaveDisabled(): boolean {
    return this.form.invalid || this.isSubmitting || (!this.form.dirty && !this.avatarChanged);
  }

  protected onSubmit(): void {
    if (this.isSaveDisabled) return;

    const group = this.group();
    if (!group) return;

    const name = this.form.get('name')?.value;
    const description = this.form.get('description')?.value;
    if (!name) return;

    this.isSubmitting = true;

    this.groupsService
      .update(group.id, {
        name,
        description: description || '',
        ...(this.avatarChanged && this.newAvatarBase64 ? { avatar: this.newAvatarBase64 } : {}),
      })
      .subscribe({
        next: (updated) => {
          this.group.set(updated);
          this.isSubmitting = false;
          this.avatarChanged = false;
          this.newAvatarBase64 = null;
          this.form.markAsPristine();
          this.alerts.open('Group updated successfully', { appearance: 'positive' }).subscribe();
        },
        error: (err) => {
          console.error('Failed to update group:', err);
          this.isSubmitting = false;
          this.alerts.open('Failed to update group', { appearance: 'negative' }).subscribe();
        },
      });
  }

  protected onDeleteGroup(): void {
    if (this.isDeleting) return;

    const group = this.group();
    if (!group) return;

    const data: TuiConfirmData = {
      content: 'This action cannot be undone. All group data will be permanently deleted.',
      yes: 'Delete Group',
      no: 'Cancel',
      appearance: 'accent',
    };

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: 'Delete Group',
        size: 's',
        data,
      })
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.isDeleting = true;
          return this.groupsService.delete(group.id);
        }),
      )
      .subscribe({
        next: () => {
          this.alerts.open('Group deleted', { appearance: 'positive' }).subscribe();
          this.router.navigate(['/groups']);
        },
        error: (err) => {
          console.error('Failed to delete group:', err);
          this.isDeleting = false;
          this.alerts.open('Failed to delete group', { appearance: 'negative' }).subscribe();
        },
      });
  }
}
