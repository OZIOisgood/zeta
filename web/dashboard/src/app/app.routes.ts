import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ShellComponent } from './shared/components/shell/shell.component';
import { UploadVideoComponent } from './upload-video/upload-video.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'upload-video', component: UploadVideoComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
