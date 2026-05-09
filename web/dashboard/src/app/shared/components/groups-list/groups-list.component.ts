import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiAppearance, TuiSurface, TuiTitle } from '@taiga-ui/core';
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
    TuiSkeleton,
    TuiAppearance,
    SectionHeaderComponent,
    IllustratedMessageComponent,
    TranslatePipe,
  ],
  templateUrl: './groups-list.component.html',
  styleUrls: ['./groups-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupsListComponent {
  @Input() groups: Group[] = [];
  @Input() showCreateTile = false;
  @Input() loading = false;
  @Input() title = 'groups.myGroups';
  @Output() createGroup = new EventEmitter<void>();
  @Output() selectGroup = new EventEmitter<string>();

  onCreateClick(): void {
    this.createGroup.emit();
  }

  onGroupClick(groupId: string): void {
    this.selectGroup.emit(groupId);
  }
}
