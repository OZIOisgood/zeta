import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { switchMap, take } from 'rxjs';
import { AcceptInviteDialogComponent } from '../../shared/components/accept-invite-dialog/accept-invite-dialog.component';
import { GroupsListComponent } from '../../shared/components/groups-list/groups-list.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { GroupsService } from '../../shared/services/groups.service';
import { InvitationInfo, InvitationsService } from '../../shared/services/invitations.service';
import { PermissionsService } from '../../shared/services/permissions.service';

@Component({
  selector: 'app-groups-page',
  standalone: true,
  imports: [CommonModule, PageContainerComponent, GroupsListComponent, AsyncPipe],
  templateUrl: './groups-page.component.html',
  styleUrls: ['./groups-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupsPageComponent implements OnInit {
  private readonly groupsService = inject(GroupsService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly invitationsService = inject(InvitationsService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly groups$ = this.groupsService.list();
  readonly showCreateTile = computed(() => this.permissionsService.hasPermission('groups:create'));

  ngOnInit(): void {
    const inviteCode = this.route.snapshot.queryParamMap.get('invite');
    if (!inviteCode) {
      return;
    }

    this.invitationsService
      .getInfo(inviteCode)
      .pipe(
        switchMap((info: InvitationInfo) =>
          this.dialogs.open<string | null>(new PolymorpheusComponent(AcceptInviteDialogComponent), {
            label: 'Group Invitation',
            size: 's',
            data: info,
          }),
        ),
        take(1),
      )
      .subscribe({
        next: (groupId) => {
          if (groupId) {
            this.router.navigate(['/groups', groupId]);
          } else {
            this.router.navigate(['/groups']);
          }
        },
        error: (err) => {
          console.error('Failed to process invitation:', err);
          this.router.navigate(['/groups']);
        },
      });
  }

  onCreateGroup(): void {
    this.router.navigate(['/create-group']);
  }

  onSelectGroup(groupId: string): void {
    this.router.navigate(['/groups', groupId]);
  }
}
