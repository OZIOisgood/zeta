import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import '@mux/mux-player';
import { TuiButton } from '@taiga-ui/core';
import { TuiPagination } from '@taiga-ui/kit';
import { Observable, switchMap } from 'rxjs';
import { Asset, AssetService } from '../shared/services/asset.service';

@Component({
  selector: 'app-asset-details',
  standalone: true,
  imports: [CommonModule, RouterLink, TuiButton, TuiPagination],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './asset-details.component.html',
  styleUrls: ['./asset-details.component.scss'],
})
export class AssetDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assetService = inject(AssetService);

  asset$!: Observable<Asset>;
  videoIndex = 0;

  ngOnInit() {
    this.asset$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id')!;
        return this.assetService.getAsset(id);
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
        this.videoIndex = Number(index);
      }
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
