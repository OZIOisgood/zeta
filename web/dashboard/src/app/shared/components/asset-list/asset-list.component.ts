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

  hoveredAssetId: string | null = null;

  formatStatus(status: string): string {
    if (status === 'pending') {
      return 'In review';
    }
    if (status === 'completed') {
      return 'Reviewed';
    }
    return status.replace('_', ' ');
  }

  getThumbnail(asset: Asset): string | null {
    if (!asset.thumbnail) {
      return null;
    }

    if (this.hoveredAssetId === asset.id) {
      return `url(${asset.thumbnail.replace(/\/thumbnail\.[a-z]+/, '/animated.gif')})`;
    }

    return `url(${asset.thumbnail})`;
  }

  onMouseEnter(assetId: string): void {
    this.hoveredAssetId = assetId;
  }

  onMouseLeave(): void {
    this.hoveredAssetId = null;
  }
}
