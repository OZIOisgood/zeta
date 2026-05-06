import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, shareReplay, startWith, tap } from 'rxjs';
import { AssetListComponent } from '../../shared/components/asset-list/asset-list.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { AssetService } from '../../shared/services/asset.service';
import { AuthService } from '../../shared/services/auth.service';
import { PermissionsService } from '../../shared/services/permissions.service';
import { ReviewStatusBuckets, splitAssetsByReviewStatus } from './videos-page.utils';

@Component({
  selector: 'app-videos-page',
  standalone: true,
  imports: [CommonModule, PageContainerComponent, AssetListComponent],
  templateUrl: './videos-page.component.html',
  styleUrls: ['./videos-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideosPageComponent {
  private readonly router = inject(Router);
  private readonly assetService = inject(AssetService);
  private readonly permissionsService = inject(PermissionsService);
  public readonly auth = inject(AuthService);

  public readonly loading = signal(true);
  private readonly emptyReviewStatusBuckets: ReviewStatusBuckets = {
    inReview: [],
    toReview: [],
    reviewed: [],
  };
  public readonly assets$ = this.assetService.getAssets().pipe(
    tap({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  public readonly reviewStatusBuckets$ = this.assets$.pipe(
    map(splitAssetsByReviewStatus),
    startWith(this.emptyReviewStatusBuckets),
  );
  public readonly showUploadVideo = computed(() =>
    this.permissionsService.hasPermission('assets:create'),
  );
  public readonly showReviewStatusBuckets = computed(() =>
    this.permissionsService.hasPermission('assets:finalize'),
  );

  onAddVideo(): void {
    this.router.navigate(['/upload-video']);
  }
}
