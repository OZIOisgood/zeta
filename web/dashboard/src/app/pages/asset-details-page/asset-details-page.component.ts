import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, inject, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import '@mux/mux-player';
import { TuiResponsiveDialogService } from '@taiga-ui/addon-mobile';
import { TuiAutoFocus } from '@taiga-ui/cdk';
import {
  TuiAlertService,
  TuiButton,
  TuiDataList,
  TuiDialog,
  TuiDropdown,
  TuiIcon,
  TuiLink,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiBadge,
  TuiElasticContainer,
  TuiPagination,
  TuiTextarea,
  type TuiConfirmData,
} from '@taiga-ui/kit';
import { TuiCardLarge } from '@taiga-ui/layout';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  switchMap,
  tap,
  type Observer,
} from 'rxjs';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { Asset, AssetService, Review } from '../../shared/services/asset.service';
import { PermissionsService } from '../../shared/services/permissions.service';

@Component({
  selector: 'app-asset-details-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TuiButton,
    TuiPagination,
    PageContainerComponent,
    ReactiveFormsModule,
    TuiCardLarge,
    TuiTextarea,
    TuiTextfield,
    TuiDropdown,
    TuiDataList,
    TuiIcon,
    TuiDialog,
    TuiAutoFocus,
    TuiElasticContainer,
    TuiLink,
    TuiBadge,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './asset-details-page.component.html',
  styleUrls: ['./asset-details-page.component.scss'],
})
export class AssetDetailsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assetService = inject(AssetService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly alerts = inject(TuiAlertService);
  private readonly dialogs = inject(TuiResponsiveDialogService);

  asset$!: Observable<Asset>;
  reviews$ = new BehaviorSubject<Review[]>([]);
  videoIndex = 0;

  private readonly refresh$ = new BehaviorSubject<void>(void 0);

  reviewControl = new FormControl('');

  readonly canReadReviews = computed(() => this.permissionsService.hasPermission('reviews:read'));
  readonly canAddReviews = computed(() => this.permissionsService.hasPermission('reviews:create'));
  readonly canDeleteReviews = computed(() =>
    this.permissionsService.hasPermission('reviews:delete'),
  );
  readonly canEditReviews = computed(() => this.permissionsService.hasPermission('reviews:edit'));
  readonly canFinalizeReviews = computed(() =>
    this.permissionsService.hasPermission('assets:finalize'),
  );

  protected editReviewControl = new FormControl('');
  protected editDialogOpen = false;
  protected editingReviewId: string | null = null;

  asset: Asset | null = null;
  private reviewsLoaded = false;

  protected descriptionExpanded = false;
  protected readonly descriptionCharLimit = 200;

  constructor() {
    // Use effect to load reviews when user permissions become available
    effect(() => {
      const canRead = this.canReadReviews();
      if (canRead && this.asset && !this.reviewsLoaded) {
        const video = this.getCurrentVideo();
        if (video) {
          this.loadReviews(video.id);
        }
      }
    });
  }

  ngOnInit() {
    this.asset$ = combineLatest([this.route.paramMap, this.refresh$]).pipe(
      map(([params]) => params.get('id')!),
      switchMap((id) => this.assetService.getAsset(id)),
      tap((asset) => {
        this.asset = asset;
        this.reviewsLoaded = false;
        // Try loading reviews - will work if permissions are ready
        if (this.canReadReviews()) {
          const video = this.getCurrentVideo();
          if (video) {
            this.loadReviews(video.id);
          }
        }
      }),
    );

    this.route.queryParams.subscribe((params) => {
      const index = params['video'];
      if (index === undefined) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { video: 0 },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      } else {
        const prevIndex = this.videoIndex;
        this.videoIndex = Number(index);

        // Reload reviews if video changed
        if (prevIndex !== this.videoIndex && this.asset && this.canReadReviews()) {
          this.reviewsLoaded = false;
          const video = this.getCurrentVideo();
          if (video) {
            this.loadReviews(video.id);
          }
        }
      }
    });
  }

  getCurrentVideo() {
    if (!this.asset || !this.asset.videos) return null;
    return this.asset.videos[this.videoIndex];
  }

  loadReviews(videoId: string) {
    this.reviewsLoaded = true;
    this.assetService.getReviews(videoId).subscribe({
      next: (reviews) => this.reviews$.next(reviews),
      error: (err) => console.error('Failed to load reviews', err),
    });
  }

  postReview() {
    const video = this.getCurrentVideo();
    if (!video || !this.canAddReviews() || !this.reviewControl.value) return;

    this.assetService.createReview(video.id, this.reviewControl.value).subscribe({
      next: () => {
        this.reviewControl.setValue('');
        this.loadReviews(video.id);
      },
      error: (err) => console.error('Failed to post review', err),
    });
  }

  deleteReview(reviewId: string) {
    const video = this.getCurrentVideo();
    if (!video || !this.canDeleteReviews()) return;

    const data: TuiConfirmData = {
      content: 'Are you sure you want to delete this comment? This action cannot be undone.',
      yes: 'Delete',
      no: 'Cancel',
    };

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: 'Delete Comment',
        size: 's',
        data,
      })
      .pipe(
        switchMap((response) => {
          if (response) {
            return this.assetService.deleteReview(video.id, reviewId);
          }
          throw new Error('Cancelled');
        }),
      )
      .subscribe({
        next: () => {
          this.loadReviews(video.id);
          this.alerts.open('Comment deleted successfully').subscribe();
        },
        error: (err: Error) => {
          if (err.message !== 'Cancelled') {
            console.error('Failed to delete review', err);
            this.alerts.open('Failed to delete comment', { appearance: 'error' }).subscribe();
          }
        },
      });
  }

  onIndexChange(index: number) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { video: index },
      queryParamsHandling: 'merge',
    });
  }

  getPlaybackId(asset: Asset): string | undefined {
    if (asset.videos?.length) {
      return asset.videos[this.videoIndex]?.playback_id;
    }
    return asset.playback_id;
  }

  showEditDialog(review: Review): void {
    this.editingReviewId = review.id;
    this.editReviewControl.setValue(review.content);
    this.editDialogOpen = true;
  }

  saveEditedReview(observer: Observer<void>): void {
    const video = this.getCurrentVideo();
    if (!video || !this.editingReviewId || !this.editReviewControl.value) return;

    this.assetService
      .updateReview(video.id, this.editingReviewId, this.editReviewControl.value)
      .subscribe({
        next: () => {
          this.loadReviews(video.id);
          observer.complete();
        },
        error: (err) => {
          console.error('Failed to update review', err);
          this.alerts.open('Failed to update review', { appearance: 'error' }).subscribe();
        },
      });
  }

  getDisplayDescription(): string {
    if (!this.asset?.description) return '';
    if (this.descriptionExpanded || this.asset.description.length <= this.descriptionCharLimit) {
      return this.asset.description;
    }
    return this.asset.description.slice(0, this.descriptionCharLimit) + '...';
  }

  toggleDescription(): void {
    this.descriptionExpanded = !this.descriptionExpanded;
  }

  shouldShowToggle(): boolean {
    return (this.asset?.description?.length || 0) > this.descriptionCharLimit;
  }

  isFinalized(): boolean {
    return this.asset?.status === 'completed';
  }

  finalizeVideo(): void {
    if (!this.asset) return;

    const data: TuiConfirmData = {
      content:
        'Are you sure you want to mark this video as reviewed? No more comments can be added, edited, or deleted.',
      yes: 'Mark as Reviewed',
      no: 'Cancel',
    };

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: 'Mark Video as Reviewed',
        size: 's',
        data,
      })
      .pipe(
        switchMap((response) => {
          if (response) {
            return this.assetService.finalizeVideo(this.asset!.id);
          }
          throw new Error('Cancelled');
        }),
      )
      .subscribe({
        next: () => {
          this.refresh$.next();
          this.alerts.open('Video marked as reviewed successfully').subscribe();
        },
        error: (err: Error) => {
          if (err.message !== 'Cancelled') {
            console.error('Failed to mark video as reviewed', err);
            this.alerts
              .open('Failed to mark video as reviewed', { appearance: 'error' })
              .subscribe();
          }
        },
      });
  }

  getStatusAppearance(status: string): string {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  formatStatus(status: string): string {
    if (status === 'pending') {
      return 'reviewing';
    }
    if (status === 'completed') {
      return 'reviewed';
    }
    return status.replace('_', ' ');
  }
}
