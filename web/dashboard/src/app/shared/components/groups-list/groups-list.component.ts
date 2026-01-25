import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TuiSurface, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiCardMedium } from '@taiga-ui/layout';
import { Group } from '../../services/groups.service';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [CommonModule, TuiCardMedium, TuiSurface, TuiTitle, TuiAvatar],
  templateUrl: './groups-list.component.html',
  styleUrls: ['./groups-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupsListComponent {
  @Input() groups: Group[] = [];
  @Input() showCreateTile = false;
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
