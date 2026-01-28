import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GroupsListComponent } from '../../shared/components/groups-list/groups-list.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { FeatureService } from '../../shared/services/feature.service';
import { GroupsService } from '../../shared/services/groups.service';

@Component({
  selector: 'app-groups-page',
  standalone: true,
  imports: [CommonModule, PageContainerComponent, GroupsListComponent, AsyncPipe],
  templateUrl: './groups-page.component.html',
  styleUrls: ['./groups-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupsPageComponent {
  private readonly groupsService = inject(GroupsService);
  private readonly featureService = inject(FeatureService);
  private readonly router = inject(Router);

  readonly groups$ = this.groupsService.list();
  readonly showCreateTile = computed(() => this.featureService.hasFeature('groups--create'));

  onCreateGroup(): void {
    this.router.navigate(['/create-group']);
  }

  onSelectGroup(groupId: string): void {
    this.router.navigate(['/groups', groupId]);
  }
}
