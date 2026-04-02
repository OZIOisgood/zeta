import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TuiAlertService, TuiButton, TuiDialogService, TuiLink } from '@taiga-ui/core';
import { TuiElasticContainer } from '@taiga-ui/kit';
import { TuiCardLarge } from '@taiga-ui/layout';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Observable, catchError, filter, map, of, startWith, switchMap, take } from 'rxjs';
import { GroupPreferencesDialogComponent } from '../../shared/components/group-preferences-dialog/group-preferences-dialog.component';
import { InviteDialogComponent } from '../../shared/components/invite-dialog/invite-dialog.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { UsersListComponent } from '../../shared/components/users-list/users-list.component';
import { Group, GroupsService } from '../../shared/services/groups.service';
import { PermissionsService } from '../../shared/services/permissions.service';

@Component({
  selector: 'app-group-details-page',
  standalone: true,
  imports: [
    CommonModule,
    PageContainerComponent,
    UsersListComponent,
    TuiButton,
    TuiLink,
    TuiCardLarge,
    TuiElasticContainer,
  ],
  templateUrl: './group-details-page.component.html',
  styleUrls: ['./group-details-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly permissionsService = inject(PermissionsService);
  private readonly groupsService = inject(GroupsService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly alerts = inject(TuiAlertService);

  readonly groupId$ = this.route.paramMap.pipe(map((params) => params.get('id')));
  readonly group$ = this.groupId$.pipe(
    filter((id): id is string => !!id),
    switchMap((id) => this.groupsService.get(id)),
  );

  private readonly defaultGradient =
    'linear-gradient(160deg, #2e2e2e 0%, #5c5c5c 50%, #b0b0b0 100%)';

  readonly headerGradient$ = this.group$.pipe(
    switchMap((group) => {
      const avatarSrc = this.getAvatarSrc(group.avatar);
      if (!avatarSrc) return of(this.defaultGradient);
      return this.extractGradientFromAvatar(avatarSrc);
    }),
    startWith(this.defaultGradient),
    catchError(() => of(this.defaultGradient)),
  );

  readonly showUsersList = computed(() =>
    this.permissionsService.hasPermission('groups:user-list:read'),
  );
  readonly showInviteButton = computed(() =>
    this.permissionsService.hasPermission('groups:invites:create'),
  );
  readonly showPrefsButton = computed(() =>
    this.permissionsService.hasPermission('groups:preferences:edit'),
  );

  protected descriptionExpanded = false;
  protected readonly descriptionCharLimit = 200;

  getAvatarSrc(avatar: string | null): string | null {
    if (!avatar) return null;
    return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
  }

  private extractGradientFromAvatar(avatarSrc: string): Observable<string> {
    return new Observable<string>((observer) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          observer.next(this.defaultGradient);
          observer.complete();
          return;
        }
        ctx.drawImage(img, 0, 0, 10, 10);
        const data = ctx.getImageData(0, 0, 10, 10).data;
        // Sample top, middle, and bottom thirds of the resized image
        const color1 = this.averageColor(data, 0, 33);
        const color2 = this.averageColor(data, 33, 67);
        const color3 = this.averageColor(data, 67, 100);
        observer.next(`linear-gradient(160deg, ${color1} 0%, ${color2} 50%, ${color3} 100%)`);
        observer.complete();
      };
      img.onerror = () => {
        observer.next(this.defaultGradient);
        observer.complete();
      };
      img.src = avatarSrc;
    });
  }

  private averageColor(data: Uint8ClampedArray, startPixel: number, endPixel: number): string {
    let r = 0,
      g = 0,
      b = 0;
    const count = endPixel - startPixel;
    for (let i = startPixel; i < endPixel; i++) {
      r += data[i * 4];
      g += data[i * 4 + 1];
      b += data[i * 4 + 2];
    }
    return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
  }

  getDisplayDescription(group: Group): string {
    if (!group.description) return '';
    if (this.descriptionExpanded || group.description.length <= this.descriptionCharLimit) {
      return group.description;
    }
    return group.description.slice(0, this.descriptionCharLimit) + '...';
  }

  shouldShowToggle(group: Group): boolean {
    return (group.description?.length || 0) > this.descriptionCharLimit;
  }

  toggleDescription(): void {
    this.descriptionExpanded = !this.descriptionExpanded;
  }

  openInviteDialog(groupId: string): void {
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(InviteDialogComponent), {
        label: 'Invite User',
        size: 's',
        data: groupId,
      })
      .pipe(take(1), filter(Boolean))
      .subscribe(() => {
        this.alerts.open('Invitation sent', { appearance: 'positive' }).subscribe();
      });
  }

  openPreferencesDialog(group: Group): void {
    this.dialogs
      .open<Group>(new PolymorpheusComponent(GroupPreferencesDialogComponent), {
        label: 'Group Preferences',
        size: 's',
        data: group,
      })
      .pipe(take(1), filter(Boolean))
      .subscribe(() => {
        this.alerts.open('Group updated', { appearance: 'positive' }).subscribe();
      });
  }
}
