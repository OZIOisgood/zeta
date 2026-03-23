import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TuiAppearance, TuiButton, TuiSurface, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar, TuiSkeleton } from '@taiga-ui/kit';
import { TuiBlockStatus, TuiCardMedium } from '@taiga-ui/layout';
import { Group } from '../../services/groups.service';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [
    CommonModule,
    TuiCardMedium,
    TuiSurface,
    TuiTitle,
    TuiAvatar,
    TuiBlockStatus,
    TuiButton,
    TuiSkeleton,
    TuiAppearance,
  ],
  templateUrl: './groups-list.component.html',
  styleUrls: ['./groups-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupsListComponent {
  @Input() groups: Group[] = [];
  @Input() showCreateTile = false;
  @Input() loading = false;
  @Input() title = 'My Groups';
  @Output() createGroup = new EventEmitter<void>();
  @Output() selectGroup = new EventEmitter<string>();

  onCreateClick(): void {
    this.createGroup.emit();
  }

  onGroupClick(groupId: string): void {
    this.selectGroup.emit(groupId);
  }
}
