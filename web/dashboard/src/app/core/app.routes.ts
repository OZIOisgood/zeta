import { Routes } from '@angular/router';
import { AssetDetailsPageComponent } from '../pages/asset-details-page/asset-details-page.component';
import { BookCoachingPageComponent } from '../pages/book-coaching-page/book-coaching-page.component';
import { CreateGroupPageComponent } from '../pages/create-group-page/create-group-page.component';
import { GroupDetailsPageComponent } from '../pages/group-details-page/group-details-page.component';
import { GroupPreferencesPageComponent } from '../pages/group-preferences-page/group-preferences-page.component';
import { GroupsPageComponent } from '../pages/groups-page/groups-page.component';
import { HomePageComponent } from '../pages/home-page/home-page.component';
import { ManageAvailabilityPageComponent } from '../pages/manage-availability-page/manage-availability-page.component';
import { MySessionsPageComponent } from '../pages/my-sessions-page/my-sessions-page.component';
import { UploadVideoPageComponent } from '../pages/upload-video-page/upload-video-page.component';
import { UserPreferencesPageComponent } from '../pages/user-preferences-page/user-preferences-page.component';
import { VideoCallPageComponent } from '../pages/video-call-page/video-call-page.component';
import { VideosPageComponent } from '../pages/videos-page/videos-page.component';
import { ShellComponent } from '../shared/components/shell/shell.component';
import { permissionGuard } from './guards/permission.guard';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', component: HomePageComponent },
      { path: 'videos', component: VideosPageComponent },
      { path: 'preferences', redirectTo: 'preferences/personal-data', pathMatch: 'full' },
      { path: 'preferences/:tab', component: UserPreferencesPageComponent },
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
        path: 'groups/:id/preferences',
        redirectTo: 'groups/:id/preferences/general',
        pathMatch: 'full',
      },
      {
        path: 'groups/:id/preferences/:tab',
        component: GroupPreferencesPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'groups:preferences:edit' },
      },
      // Sessions hub — visible to both students and experts
      {
        path: 'sessions',
        redirectTo: 'sessions/upcoming',
        pathMatch: 'full',
      },
      {
        path: 'sessions/book',
        component: BookCoachingPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:book' },
      },
      {
        path: 'sessions/settings',
        component: ManageAvailabilityPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:availability:manage' },
      },
      {
        path: 'sessions/settings/:groupId',
        redirectTo: 'sessions/settings/:groupId/session-types',
        pathMatch: 'full',
      },
      {
        path: 'sessions/settings/:groupId/:tab',
        component: ManageAvailabilityPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:availability:manage' },
      },
      {
        path: 'sessions/:tab',
        component: MySessionsPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:bookings:read' },
      },
      // Legacy redirects
      { path: 'my-sessions', redirectTo: 'sessions', pathMatch: 'full' },
      { path: 'book-coaching', redirectTo: 'sessions/book', pathMatch: 'full' },
      {
        path: 'groups/:groupID/coaching/availability',
        redirectTo: 'sessions/settings',
        pathMatch: 'full',
      },
    ],
  },
  // Full-screen video call — no navbar, no sidebar, no app chrome
  {
    path: 'sessions/:groupId/:bookingId/call',
    component: VideoCallPageComponent,
    canActivate: [permissionGuard],
    data: { permission: 'coaching:video:connect' },
  },
  { path: '**', redirectTo: '' },
];
