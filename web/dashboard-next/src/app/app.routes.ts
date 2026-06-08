import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { ShellComponent } from './core/shell/shell.component';
import { CreateGroupPageComponent } from './pages/create-group/create-group-page.component';
import { GroupDetailsPageComponent } from './pages/group-details/group-details-page.component';
import { GroupPreferencesPageComponent } from './pages/group-preferences/group-preferences-page.component';
import { GroupsPageComponent } from './pages/groups/groups-page.component';
import { HomePageComponent } from './pages/home/home-page.component';
import { NotificationsPageComponent } from './pages/notifications/notifications-page.component';
import { ReportsPageComponent } from './pages/reports/reports-page.component';
import { BookCoachingPageComponent } from './pages/book-coaching/book-coaching-page.component';
import { ManageAvailabilityPageComponent } from './pages/manage-availability/manage-availability-page.component';
import { PreferencesPageComponent } from './pages/preferences/preferences-page.component';
import { SessionsPageComponent } from './pages/sessions/sessions-page.component';
import { UploadVideoPageComponent } from './pages/upload-video/upload-video-page.component';
import { VideoCallPageComponent } from './pages/video-call/video-call-page.component';
import { VideoDetailsPageComponent } from './pages/video-details/video-details-page.component';
import { VideosPageComponent } from './pages/videos/videos-page.component';

export const routes: Routes = [
  {
    path: 'sessions/:groupId/:bookingId/call',
    component: VideoCallPageComponent,
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'coaching:video:connect' },
    title: 'Live coaching',
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: HomePageComponent, title: 'Zeta' },
      { path: 'videos', component: VideosPageComponent, title: 'Zeta Videos' },
      { path: 'reports', redirectTo: 'reports/experts', pathMatch: 'full' },
      {
        path: 'reports/experts',
        component: ReportsPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'reports:read', role: 'expert' },
        title: 'Experten-Bericht',
      },
      {
        path: 'reports/students',
        component: ReportsPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'reports:read', role: 'student' },
        title: 'Schüler-Bericht',
      },
      { path: 'notifications', component: NotificationsPageComponent, title: 'Notifications' },
      { path: 'preferences', redirectTo: 'preferences/personal-data', pathMatch: 'full' },
      { path: 'preferences/:tab', component: PreferencesPageComponent, title: 'Preferences' },
      {
        path: 'upload-video',
        component: UploadVideoPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'assets:create' },
        title: 'Upload video',
      },
      { path: 'asset/:id', component: VideoDetailsPageComponent, title: 'Video details' },
      {
        path: 'groups',
        component: GroupsPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'groups:read' },
        title: 'Zeta Groups',
      },
      {
        path: 'create-group',
        component: CreateGroupPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'groups:create' },
        title: 'Create group',
      },
      {
        path: 'groups/:id',
        component: GroupDetailsPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'groups:read' },
        title: 'Group details',
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
        data: { permission: 'groups:read' },
        title: 'Group preferences',
      },
      { path: 'sessions', redirectTo: 'sessions/upcoming', pathMatch: 'full' },
      {
        path: 'sessions/book',
        component: BookCoachingPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:book' },
        title: 'Book coaching',
      },
      {
        path: 'sessions/settings',
        component: ManageAvailabilityPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:availability:manage' },
        title: 'Manage availability',
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
        title: 'Manage availability',
      },
      {
        path: 'sessions/:tab',
        component: SessionsPageComponent,
        canActivate: [permissionGuard],
        data: { permission: 'coaching:bookings:read' },
        title: 'Sessions',
      },
      { path: 'my-sessions', redirectTo: 'sessions', pathMatch: 'full' },
      { path: 'book-coaching', redirectTo: 'sessions/book', pathMatch: 'full' },
      { path: '**', redirectTo: '' },
    ],
  },
];
