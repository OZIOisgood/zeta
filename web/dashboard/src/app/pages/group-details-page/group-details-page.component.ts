import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TuiAlertService, TuiButton, TuiDialogService, TuiLink } from '@taiga-ui/core';
import { TuiElasticContainer } from '@taiga-ui/kit';
import { TuiCardLarge } from '@taiga-ui/layout';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Observable, catchError, filter, map, of, startWith, switchMap, take } from 'rxjs';
import { GroupPreferencesDialogComponent } from '../../shared/components/group-preferences-dialog/group-preferences-dialog.component';
import { InviteDialogComponent } from '../../shared/components/invite-dialog/invite-dialog.component';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { UsersListComponent } from '../../shared/components/users-list/users-list.component';
import { CoachingBooking, CoachingService } from '../../shared/services/coaching.service';
import { Group, GroupsService } from '../../shared/services/groups.service';
import { PermissionsService } from '../../shared/services/permissions.service';

@Component({
  selector: 'app-group-details-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
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
  private readonly router = inject(Router);
  private readonly permissionsService = inject(PermissionsService);
  private readonly groupsService = inject(GroupsService);
  private readonly coachingService = inject(CoachingService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly alerts = inject(TuiAlertService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly groupId$ = this.route.paramMap.pipe(map((params) => params.get('id')));
  readonly group$ = this.groupId$.pipe(
    filter((id): id is string => !!id),
    switchMap((id) => this.groupsService.get(id)),
  );

  protected groupSessions = signal<CoachingBooking[]>([]);
  protected sessionsLoading = signal(false);

  constructor() {
    this.groupId$.pipe(filter((id): id is string => !!id)).subscribe((id) => {
      this.loadGroupSessions(id);
    });
  }

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
  readonly showManageAvailability = computed(() =>
    this.permissionsService.hasPermission('coaching:availability:manage'),
  );
  readonly showCoachingSessions = computed(() =>
    this.permissionsService.hasPermission('coaching:bookings:read'),
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
        const size = 20;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          observer.next(this.defaultGradient);
          observer.complete();
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // Score each pixel by vividness: rewards saturation, penalises near-black / near-white.
        // This means even a tiny sliver of vivid colour dominates over large dark/grey areas.
        const pixels = Array.from({ length: size * size }, (_, i) => {
          const r = data[i * 4] / 255;
          const g = data[i * 4 + 1] / 255;
          const b = data[i * 4 + 2] / 255;
          const [h, s, l] = this.rgbToHsl(r, g, b);
          const score = s * Math.max(0, 1 - Math.abs(0.5 - l) * 1.8);
          return { h, s, l, score };
        });

        pixels.sort((a, b) => b.score - a.score);
        const vivid = pixels.slice(0, Math.max(5, Math.ceil(pixels.length * 0.15)));

        let pH: number, pS: number, pL: number;
        if (vivid[0].score > 0.05) {
          // At least one genuinely vivid pixel — base palette on the most vivid colours.
          pH = this.circularMeanHue(vivid.map((p) => p.h));
          pS = vivid.reduce((sum, p) => sum + p.s, 0) / vivid.length;
          pL = vivid.reduce((sum, p) => sum + p.l, 0) / vivid.length;
        } else {
          // Greyscale or very muted image — fall back to the brightest pixels.
          const bright = [...pixels]
            .sort((a, b) => b.l - a.l)
            .slice(0, Math.max(5, Math.ceil(pixels.length * 0.15)));
          pH = this.circularMeanHue(bright.map((p) => p.h));
          pS = bright.reduce((sum, p) => sum + p.s, 0) / bright.length;
          pL = bright.reduce((sum, p) => sum + p.l, 0) / bright.length;
        }

        // Three stops: dark anchor → primary vivid colour → lighter hue-shifted highlight
        const c1 = this.hslToCss(pH, pS * 0.85, Math.max(pL - 0.22, 0.05));
        const c2 = this.hslToCss(pH, pS, pL);
        const c3 = this.hslToCss((pH + 20) % 360, pS * 0.7, Math.min(pL + 0.22, 0.92));

        observer.next(`linear-gradient(160deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`);
        observer.complete();
      };
      img.onerror = () => {
        observer.next(this.defaultGradient);
        observer.complete();
      };
      img.src = avatarSrc;
    });
  }

  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h: number;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h * 360, s, l];
  }

  // Circular mean avoids the 0°/360° boundary artefact in a plain arithmetic average.
  private circularMeanHue(hues: number[]): number {
    const toRad = Math.PI / 180;
    const sinSum = hues.reduce((s, h) => s + Math.sin(h * toRad), 0);
    const cosSum = hues.reduce((s, h) => s + Math.cos(h * toRad), 0);
    return ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
  }

  private hslToCss(h: number, s: number, l: number): string {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
    };
    return `rgb(${f(0)}, ${f(8)}, ${f(4)})`;
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

  loadGroupSessions(groupId: string): void {
    this.sessionsLoading.set(true);
    this.coachingService.listGroupSessions(groupId).subscribe({
      next: (sessions) => {
        this.groupSessions.set(sessions ?? []);
        this.sessionsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.sessionsLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  formatSessionDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      .open<Group | null>(new PolymorpheusComponent(GroupPreferencesDialogComponent), {
        label: 'Group Preferences',
        size: 's',
        data: group,
      })
      .pipe(take(1))
      .subscribe((result) => {
        if (result === null) {
          // Group was deleted — navigate back to groups list
          this.alerts.open('Group deleted', { appearance: 'positive' }).subscribe();
          this.router.navigate(['/groups']);
        } else if (result) {
          this.alerts.open('Group updated', { appearance: 'positive' }).subscribe();
        }
      });
  }
}
