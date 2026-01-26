import { Routes } from '@angular/router';
import { AssetDetailsPageComponent } from '../pages/asset-details-page/asset-details-page.component';
import { CreateGroupPageComponent } from '../pages/create-group-page/create-group-page.component';
import { GroupDetailsPageComponent } from '../pages/group-details-page/group-details-page.component';
import { GroupsPageComponent } from '../pages/groups-page/groups-page.component';
import { HomePageComponent } from '../pages/home-page/home-page.component';
import { UploadVideoPageComponent } from '../pages/upload-video-page/upload-video-page.component';
import { ShellComponent } from '../shared/components/shell/shell.component';
import { featureGuard } from './guards/feature.guard';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', component: HomePageComponent },
      {
        path: 'upload-video',
        component: UploadVideoPageComponent,
        canActivate: [featureGuard],
        data: { feature: 'create-asset' },
      },
      { path: 'asset/:id', component: AssetDetailsPageComponent },
      {
        path: 'groups',
        component: GroupsPageComponent,
        canActivate: [featureGuard],
        data: { feature: 'groups' },
      },
      {
        path: 'create-group',
        component: CreateGroupPageComponent,
        canActivate: [featureGuard],
        data: { feature: 'create-group' },
      },
      {
        path: 'groups/:id',
        component: GroupDetailsPageComponent,
        canActivate: [featureGuard],
        data: { feature: 'groups' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
