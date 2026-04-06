import { Routes } from '@angular/router';
import { AssetDetailsPageComponent } from '../pages/asset-details-page/asset-details-page.component';
import { CoachingSessionsPageComponent } from '../pages/coaching-sessions-page/coaching-sessions-page.component';
import { CreateCoachingSessionPageComponent } from '../pages/create-coaching-session-page/create-coaching-session-page.component';
import { CreateGroupPageComponent } from '../pages/create-group-page/create-group-page.component';
import { GroupDetailsPageComponent } from '../pages/group-details-page/group-details-page.component';
import { GroupsPageComponent } from '../pages/groups-page/groups-page.component';
import { HomePageComponent } from '../pages/home-page/home-page.component';
import { UploadVideoPageComponent } from '../pages/upload-video-page/upload-video-page.component';
import { VideoCallPageComponent } from '../pages/video-call-page/video-call-page.component';
import { ShellComponent } from '../shared/components/shell/shell.component';
import { permissionGuard } from './guards/permission.guard';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', component: HomePageComponent },
      {
        path: 'upload-video',
        component: UploadVideoPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'assets:create' },
      },
      { path: 'asset/:id', component: AssetDetailsPageComponent },
      {
        path: 'groups',
        component: GroupsPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'groups:read' },
      },
      {
        path: 'create-group',
        component: CreateGroupPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'groups:create' },
      },
      {
        path: 'groups/:id',
        component: GroupDetailsPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'groups:read' },
      },
      {
        path: 'coaching',
        component: CoachingSessionsPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:read' },
      },
      {
        path: 'coaching/create',
        component: CreateCoachingSessionPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:create' },
      },
      {
        path: 'coaching/:id/call',
        component: VideoCallPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:read' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
