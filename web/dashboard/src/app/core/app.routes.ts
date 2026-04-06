import { Routes } from '@angular/router';
import { AssetDetailsPageComponent } from '../pages/asset-details-page/asset-details-page.component';
import { BookCoachingPageComponent } from '../pages/book-coaching-page/book-coaching-page.component';
import { CreateGroupPageComponent } from '../pages/create-group-page/create-group-page.component';
import { GroupDetailsPageComponent } from '../pages/group-details-page/group-details-page.component';
import { GroupsPageComponent } from '../pages/groups-page/groups-page.component';
import { HomePageComponent } from '../pages/home-page/home-page.component';
import { ManageAvailabilityPageComponent } from '../pages/manage-availability-page/manage-availability-page.component';
import { MySessionsPageComponent } from '../pages/my-sessions-page/my-sessions-page.component';
import { UploadVideoPageComponent } from '../pages/upload-video-page/upload-video-page.component';
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
        path: 'book-coaching',
        component: BookCoachingPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:book' },
      },
      {
        path: 'my-sessions',
        component: MySessionsPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:bookings:read' },
      },
      {
        path: 'groups/:groupID/coaching/availability',
        component: ManageAvailabilityPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:availability:manage' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
