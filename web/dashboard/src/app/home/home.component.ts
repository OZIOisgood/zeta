import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../shared/services/auth.service';
import { AssetService } from '../shared/services/asset.service';
import { AssetListComponent } from '../shared/components/asset-list/asset-list.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AssetListComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  private readonly router = inject(Router);
  public auth = inject(AuthService);
  private readonly assetService = inject(AssetService);

  public assets$ = this.assetService.getAssets();

  onAddVideo() {
    this.router.navigate(['/upload-video']);
  }
}
