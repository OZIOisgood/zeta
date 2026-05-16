import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './core/shell/shell.component';
import { CreateGroupPageComponent } from './pages/create-group/create-group-page.component';
import { GroupDetailsPageComponent } from './pages/group-details/group-details-page.component';
import { GroupPreferencesPageComponent } from './pages/group-preferences/group-preferences-page.component';
import { GroupsPageComponent } from './pages/groups/groups-page.component';
import { HomePageComponent } from './pages/home/home-page.component';
import { UploadVideoPageComponent } from './pages/upload-video/upload-video-page.component';
import { VideoDetailsPageComponent } from './pages/video-details/video-details-page.component';
import { VideosPageComponent } from './pages/videos/videos-page.component';

export const routes: Routes = [
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
      { path: '**', redirectTo: '' },
    ],
  },
];
