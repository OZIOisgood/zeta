import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './core/shell/shell.component';
import { CreateGroupPageComponent } from './pages/create-group/create-group-page.component';
import { GroupDetailsPageComponent } from './pages/group-details/group-details-page.component';
import { GroupPreferencesPageComponent } from './pages/group-preferences/group-preferences-page.component';
import { GroupsPageComponent } from './pages/groups/groups-page.component';
import { HomePageComponent } from './pages/home/home-page.component';
import { BookCoachingPageComponent } from './pages/book-coaching/book-coaching-page.component';
import { ManageAvailabilityPageComponent } from './pages/manage-availability/manage-availability-page.component';
import { SessionsPageComponent } from './pages/sessions/sessions-page.component';
import { UploadVideoPageComponent } from './pages/upload-video/upload-video-page.component';
import { VideoCallPageComponent } from './pages/video-call/video-call-page.component';
import { VideoDetailsPageComponent } from './pages/video-details/video-details-page.component';
import { VideosPageComponent } from './pages/videos/videos-page.component';

export const routes: Routes = [
  {
    path: 'sessions/:groupId/:bookingId/call',
    component: VideoCallPageComponent,
    canActivate: [authGuard],
    title: 'Live coaching',
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: HomePageComponent, title: 'Zeta' },
      { path: 'videos', component: VideosPageComponent, title: 'Zeta Videos' },
      { path: 'upload-video', component: UploadVideoPageComponent, title: 'Upload video' },
      { path: 'asset/:id', component: VideoDetailsPageComponent, title: 'Video details' },
      { path: 'groups', component: GroupsPageComponent, title: 'Zeta Groups' },
      { path: 'create-group', component: CreateGroupPageComponent, title: 'Create group' },
      { path: 'groups/:id', component: GroupDetailsPageComponent, title: 'Group details' },
      {
        path: 'groups/:id/preferences',
        redirectTo: 'groups/:id/preferences/general',
        pathMatch: 'full',
      },
      {
        path: 'groups/:id/preferences/:tab',
        component: GroupPreferencesPageComponent,
        title: 'Group preferences',
      },
      { path: 'sessions', redirectTo: 'sessions/upcoming', pathMatch: 'full' },
      { path: 'sessions/book', component: BookCoachingPageComponent, title: 'Book coaching' },
      {
        path: 'sessions/settings',
        component: ManageAvailabilityPageComponent,
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
        title: 'Manage availability',
      },
      { path: 'sessions/:tab', component: SessionsPageComponent, title: 'Sessions' },
      { path: 'my-sessions', redirectTo: 'sessions', pathMatch: 'full' },
      { path: 'book-coaching', redirectTo: 'sessions/book', pathMatch: 'full' },
      { path: '**', redirectTo: '' },
    ],
  },
];
