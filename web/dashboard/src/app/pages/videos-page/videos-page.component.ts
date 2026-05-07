import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { TuiFilter } from '@taiga-ui/kit/components/filter';
import { startWith, tap } from 'rxjs';
import { AssetListComponent } from '../../shared/components/asset-list/asset-list.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { AssetService } from '../../shared/services/asset.service';
import { AuthService } from '../../shared/services/auth.service';
import { PermissionsService } from '../../shared/services/permissions.service';
import {
  countAssetsByReviewStatus,
  filterAssetsByReviewStatus,
  REVIEW_STATUS_FILTERS,
  ReviewStatusFilter,
} from './videos-page.utils';

@Component({
  selector: 'app-videos-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiFilter,
    PageContainerComponent,
    SectionHeaderComponent,
    AssetListComponent,
  ],
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
  public readonly reviewStatusFilter = new FormControl<readonly ReviewStatusFilter[]>([], {
    nonNullable: true,
  });
  public readonly reviewStatusFilterItems = REVIEW_STATUS_FILTERS;
  private readonly assets$ = this.assetService.getAssets().pipe(
    tap({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    }),
  );
  public readonly assets = toSignal(this.assets$, { initialValue: [] });
  public readonly selectedReviewStatusFilters = toSignal(
    this.reviewStatusFilter.valueChanges.pipe(startWith(this.reviewStatusFilter.value)),
    { initialValue: this.reviewStatusFilter.value },
  );
  public readonly filteredReviewStatusAssets = computed(() =>
    filterAssetsByReviewStatus(this.assets(), this.selectedReviewStatusFilters()),
  );
  public readonly reviewStatusCounts = computed(() => countAssetsByReviewStatus(this.assets()));
  public readonly reviewStatusBadgeHandler = (filter: ReviewStatusFilter): number =>
    this.reviewStatusCounts()[filter];
  public readonly showUploadVideo = computed(() =>
    this.permissionsService.hasPermission('assets:create'),
  );
  public readonly showReviewStatusFilters = computed(() =>
    this.permissionsService.hasPermission('assets:finalize'),
  );

  onAddVideo(): void {
    this.router.navigate(['/upload-video']);
  }

  clearReviewStatusFilters(): void {
    this.reviewStatusFilter.setValue([]);
  }

  reviewStatusEmptyHeading(): string {
    return this.assets().length === 0 ? 'No videos yet' : 'No videos match these filters';
  }

  reviewStatusEmptyDescription(): string {
    return this.assets().length === 0
      ? "Your students haven't uploaded any videos yet."
      : 'No videos are available for the selected review statuses.';
  }
}
