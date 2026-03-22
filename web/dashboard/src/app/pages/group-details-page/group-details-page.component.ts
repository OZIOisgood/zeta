import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { map, take } from 'rxjs';
import { InviteDialogComponent } from '../../shared/components/invite-dialog/invite-dialog.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { UsersListComponent } from '../../shared/components/users-list/users-list.component';
import { PermissionsService } from '../../shared/services/permissions.service';

@Component({
  selector: 'app-group-details-page',
  standalone: true,
  imports: [CommonModule, PageContainerComponent, UsersListComponent, TuiButton],
  templateUrl: './group-details-page.component.html',
  styleUrls: ['./group-details-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly permissionsService = inject(PermissionsService);
  private readonly dialogs = inject(TuiDialogService);

  readonly groupId$ = this.route.paramMap.pipe(map((params) => params.get('id')));
  readonly showUsersList = computed(() =>
    this.permissionsService.hasPermission('groups:user-list:read'),
  );
  readonly showInviteButton = computed(() =>
    this.permissionsService.hasPermission('groups:invites:create'),
  );

  openInviteDialog(groupId: string): void {
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(InviteDialogComponent), {
        label: 'Invite User',
        size: 's',
        data: groupId,
      })
      .pipe(take(1))
      .subscribe();
  }
}
