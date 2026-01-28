import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AssetListComponent } from '../../shared/components/asset-list/asset-list.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { AssetService } from '../../shared/services/asset.service';
import { AuthService } from '../../shared/services/auth.service';
import { FeatureService } from '../../shared/services/feature.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, PageContainerComponent, AssetListComponent],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
})
export class HomePageComponent {
  private readonly router = inject(Router);
  public auth = inject(AuthService);
  private readonly assetService = inject(AssetService);
  private readonly featureService = inject(FeatureService);

  public assets$ = this.assetService.getAssets();
  public showUploadVideo = computed(() =>
    this.featureService.features().includes('assets--create'),
  );

  onAddVideo() {
    this.router.navigate(['/upload-video']);
  }
}
