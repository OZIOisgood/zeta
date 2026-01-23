import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiSurface, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar, TuiBadge } from '@taiga-ui/kit';
import { TuiCardMedium } from '@taiga-ui/layout';
import { Asset } from '../../services/asset.service';

@Component({
  selector: 'app-asset-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TuiCardMedium, TuiSurface, TuiTitle, TuiBadge, TuiAvatar],
  templateUrl: './asset-list.component.html',
  styleUrls: ['./asset-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetListComponent {
  @Input() assets: Asset[] = [];
  @Input() showAddTile = false;
  @Input() title = 'All my videos';
  @Output() addVideo = new EventEmitter<void>();

  formatStatus(status: string): string {
    if (status === 'pending') {
      return 'reviewing';
    }
    if (status === 'completed') {
      return 'reviewed';
    }
    return status.replace('_', ' ');
  }

  getThumbnail(thumbnail: string | undefined): string | null {
    return thumbnail ? `url(${thumbnail})` : null;
  }
}
