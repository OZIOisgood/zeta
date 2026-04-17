import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TuiAppearance, TuiButton, TuiSurface, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar, TuiSkeleton } from '@taiga-ui/kit';
import { TuiCardMedium } from '@taiga-ui/layout';
import { Group } from '../../services/groups.service';
import { IllustratedMessageComponent } from '../illustrated-message/illustrated-message.component';
import { SectionHeaderComponent } from '../section-header/section-header.component';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [
    CommonModule,
    TuiCardMedium,
    TuiSurface,
    TuiTitle,
    TuiAvatar,
    TuiButton,
    TuiSkeleton,
    TuiAppearance,
    SectionHeaderComponent,
    IllustratedMessageComponent,
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
