import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { UsersListComponent } from '../../shared/components/users-list/users-list.component';
import { PermissionsService } from '../../shared/services/permissions.service';

@Component({
  selector: 'app-group-details-page',
  standalone: true,
  imports: [CommonModule, PageContainerComponent, UsersListComponent],
  templateUrl: './group-details-page.component.html',
  styleUrls: ['./group-details-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly permissionsService = inject(PermissionsService);

  readonly groupId$ = this.route.paramMap.pipe(map((params) => params.get('id')));
  readonly showUsersList = computed(() =>
    this.permissionsService.hasPermission('groups:user-list:read'),
  );
}
