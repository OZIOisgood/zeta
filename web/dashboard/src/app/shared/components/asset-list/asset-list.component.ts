import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiAppearance, TuiButton, TuiSurface, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar, TuiBadge, TuiSkeleton } from '@taiga-ui/kit';
import { TuiCardMedium } from '@taiga-ui/layout';
import { Asset } from '../../services/asset.service';
import { IllustratedMessageComponent } from '../illustrated-message/illustrated-message.component';
import { SectionHeaderComponent } from '../section-header/section-header.component';

@Component({
  selector: 'app-asset-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TuiCardMedium,
    TuiSurface,
    TuiTitle,
    TuiBadge,
    TuiAvatar,
    TuiButton,
    TuiSkeleton,
    TuiAppearance,
    SectionHeaderComponent,
    IllustratedMessageComponent,
    TranslatePipe,
  ],
  templateUrl: './asset-list.component.html',
  styleUrls: ['./asset-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetListComponent {
  private readonly translate = inject(TranslateService);

  @Input() assets: Asset[] = [];
  @Input() showAddTile = false;
  @Input() showAddTileWhenEmpty = false;
  @Input() loading = false;
  @Input() title = 'videos.allMyVideos';
  @Input() headerActionLabel = '';
  @Input() headerActionRouterLink = '';
  @Input() emptyHeading = 'videos.noVideosYet';
  @Input() emptyDescription = '';
  @Input() role: string | undefined;
  @Output() addVideo = new EventEmitter<void>();

  hoveredAssetId: string | null = null;

  formatStatus(status: string): string {
    if (status === 'pending') {
      return this.translate.instant('common.status.inReview');
    }
    if (status === 'completed') {
      return this.translate.instant('common.status.reviewed');
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
