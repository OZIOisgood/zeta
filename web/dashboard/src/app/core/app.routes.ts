import { Routes } from '@angular/router';
import { AssetDetailsPageComponent } from '../pages/asset-details-page/asset-details-page.component';
import { HomePageComponent } from '../pages/home-page/home-page.component';
import { UploadVideoPageComponent } from '../pages/upload-video-page/upload-video-page.component';
import { ShellComponent } from '../shared/components/shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', component: HomePageComponent },
      { path: 'upload-video', component: UploadVideoPageComponent },
      { path: 'asset/:id', component: AssetDetailsPageComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
