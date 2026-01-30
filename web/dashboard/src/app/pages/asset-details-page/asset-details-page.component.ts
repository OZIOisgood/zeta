import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import '@mux/mux-player';
import { TuiButton, TuiTextfield } from '@taiga-ui/core';
import { TuiPagination, TuiTextarea } from '@taiga-ui/kit';
import { TuiCardLarge } from '@taiga-ui/layout';
import { BehaviorSubject, Observable, switchMap, tap } from 'rxjs';
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

  asset$!: Observable<Asset>;
  reviews$ = new BehaviorSubject<Review[]>([]);
  videoIndex = 0;

  reviewControl = new FormControl('');

  readonly canReadReviews = computed(() => this.permissionsService.hasPermission('reviews:read'));
  readonly canAddReviews = computed(() => this.permissionsService.hasPermission('reviews:create'));
  asset: Asset | null = null;

  ngOnInit() {
    this.asset$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id')!;
        return this.assetService.getAsset(id);
      }),
      tap((asset) => {
        this.asset = asset;
        const video = this.getCurrentVideo();
        if (this.canReadReviews() && video) {
          this.loadReviews(video.id);
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
}
