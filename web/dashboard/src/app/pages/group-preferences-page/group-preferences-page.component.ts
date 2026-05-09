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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
    TranslatePipe,
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
  private readonly translate = inject(TranslateService);

  private readonly tabs = ['general', 'danger-zone'] as const;
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
      { label: 'common.nav.groups', routerLink: '/groups' },
      { label: group?.name ?? '...', routerLink: group ? `/groups/${group.id}` : undefined },
      { label: 'common.actions.preferences' },
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
    this.route.paramMap.subscribe((params) => {
      this.applyTab(params.get('tab'));
    });

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
          this.ensureTabAllowed();
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

  protected onTabIndexChange(index: number): void {
    const tab = this.tabs[index] ?? this.tabs[0];
    const groupID = this.route.snapshot.paramMap.get('id');

    if (!groupID) return;

    void this.router.navigate(['/groups', groupID, 'preferences', tab]);
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
          this.alerts.open(this.translate.instant('groups.updated'), { appearance: 'positive' }).subscribe();
        },
        error: (err) => {
          console.error('Failed to update group:', err);
          this.isSubmitting = false;
          this.alerts.open(this.translate.instant('groups.updateFailed'), { appearance: 'negative' }).subscribe();
        },
      });
  }

  protected onDeleteGroup(): void {
    if (this.isDeleting) return;

    const group = this.group();
    if (!group) return;

    const data: TuiConfirmData = {
      content: this.translate.instant('groups.deleteConfirm'),
      yes: this.translate.instant('groups.deleteGroup'),
      no: this.translate.instant('common.actions.cancel'),
      appearance: 'destructive',
    };

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('groups.deleteGroup'),
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
          this.alerts.open(this.translate.instant('groups.deleted'), { appearance: 'positive' }).subscribe();
          this.router.navigate(['/groups']);
        },
        error: (err) => {
          console.error('Failed to delete group:', err);
          this.isDeleting = false;
          this.alerts.open(this.translate.instant('groups.deleteFailed'), { appearance: 'negative' }).subscribe();
        },
      });
  }

  private applyTab(tab: string | null): void {
    const index = this.tabs.findIndex((candidate) => candidate === tab);

    if (index === -1) {
      this.navigateToDefaultTab();
      return;
    }

    this.activeTabIndex.set(index);
    this.ensureTabAllowed();
  }

  private ensureTabAllowed(): void {
    if (!this.group()) return;

    if (this.activeTabIndex() === 1 && !this.isOwner()) {
      this.navigateToDefaultTab();
    }
  }

  private navigateToDefaultTab(): void {
    const groupID = this.route.snapshot.paramMap.get('id');

    if (!groupID) return;

    void this.router.navigate(['/groups', groupID, 'preferences', this.tabs[0]], {
      replaceUrl: true,
    });
  }
}
