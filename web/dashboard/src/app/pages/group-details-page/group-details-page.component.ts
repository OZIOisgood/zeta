import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TuiAlertService, TuiButton, TuiDialogService, TuiLink } from '@taiga-ui/core';
import { TuiElasticContainer } from '@taiga-ui/kit';
import { TuiCardLarge } from '@taiga-ui/layout';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { filter, map, switchMap, take } from 'rxjs';
import { GroupPreferencesDialogComponent } from '../../shared/components/group-preferences-dialog/group-preferences-dialog.component';
import { InviteDialogComponent } from '../../shared/components/invite-dialog/invite-dialog.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { UsersListComponent } from '../../shared/components/users-list/users-list.component';
import { Group, GroupsService } from '../../shared/services/groups.service';
import { PermissionsService } from '../../shared/services/permissions.service';

@Component({
  selector: 'app-group-details-page',
  standalone: true,
  imports: [
    CommonModule,
    PageContainerComponent,
    UsersListComponent,
    TuiButton,
    TuiLink,
    TuiCardLarge,
    TuiElasticContainer,
  ],
  templateUrl: './group-details-page.component.html',
  styleUrls: ['./group-details-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly permissionsService = inject(PermissionsService);
  private readonly groupsService = inject(GroupsService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly alerts = inject(TuiAlertService);

  readonly groupId$ = this.route.paramMap.pipe(map((params) => params.get('id')));
  readonly group$ = this.groupId$.pipe(
    filter((id): id is string => !!id),
    switchMap((id) => this.groupsService.get(id)),
  );

  readonly showUsersList = computed(() =>
    this.permissionsService.hasPermission('groups:user-list:read'),
  );
  readonly showInviteButton = computed(() =>
    this.permissionsService.hasPermission('groups:invites:create'),
  );
  readonly showPrefsButton = computed(() =>
    this.permissionsService.hasPermission('groups:preferences:edit'),
  );

  protected descriptionExpanded = false;
  protected readonly descriptionCharLimit = 200;

  getAvatarSrc(avatar: string | null): string | null {
    if (!avatar) return null;
    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  }

  getDisplayDescription(group: Group): string {
    if (!group.description) return '';
    if (this.descriptionExpanded || group.description.length <= this.descriptionCharLimit) {
      return group.description;
    }
    return group.description.slice(0, this.descriptionCharLimit) + '...';
  }

  shouldShowToggle(group: Group): boolean {
    return (group.description?.length || 0) > this.descriptionCharLimit;
  }

  toggleDescription(): void {
    this.descriptionExpanded = !this.descriptionExpanded;
  }

  openInviteDialog(groupId: string): void {
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(InviteDialogComponent), {
        label: 'Invite User',
        size: 's',
        data: groupId,
      })
      .pipe(take(1), filter(Boolean))
      .subscribe(() => {
        this.alerts.open('Invitation sent', { appearance: 'positive' }).subscribe();
      });
  }

  openPreferencesDialog(group: Group): void {
    this.dialogs
      .open<Group>(new PolymorpheusComponent(GroupPreferencesDialogComponent), {
        label: 'Group Preferences',
        size: 's',
        data: group,
      })
      .pipe(take(1), filter(Boolean))
      .subscribe(() => {
        this.alerts.open('Group updated', { appearance: 'positive' }).subscribe();
      });
  }
}
