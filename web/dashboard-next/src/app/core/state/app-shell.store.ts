import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  DASHBOARD_LANGUAGES,
  DashboardLanguage,
  DashboardLocalizationService,
} from '../i18n/dashboard-localization.service';

type NavigationItem = {
  id: string;
  label: string;
  labelKey: string;
  href: string;
  icon:
    | 'home'
    | 'videos'
    | 'groups'
    | 'sessions'
    | 'reports-expert'
    | 'reports-student'
    | 'invite-codes';
};

type WorkQueueItem = {
  title: string;
  meta: string;
  status: string;
  icon: 'video' | 'sessions' | 'groups';
};

type OverviewCard = {
  label: string;
  value: string;
  delta: string;
};

export type ToastType = 'success' | 'error' | 'info';

type AppShellState = {
  activeLanguage: DashboardLanguage;
  activeSection: string;
  isNavigationOpen: boolean;
  isUserMenuOpen: boolean;
  isNotificationsOpen: boolean;
  isToastVisible: boolean;
  toastMessage: string;
  toastTitle: string;
  toastType: ToastType;
  navigation: NavigationItem[];
  languages: { value: DashboardLanguage; label: string }[];
  overviewCards: OverviewCard[];
  workQueue: WorkQueueItem[];
};

const initialState: AppShellState = {
  activeLanguage: 'en',
  activeSection: 'home',
  isNavigationOpen: false,
  isUserMenuOpen: false,
  isNotificationsOpen: false,
  isToastVisible: false,
  toastMessage: '',
  toastTitle: '',
  toastType: 'info',
  navigation: [
    { id: 'home', label: 'Home', labelKey: 'common.nav.home', href: '/', icon: 'home' },
    {
      id: 'videos',
      label: 'Videos',
      labelKey: 'common.nav.videos',
      href: '/videos',
      icon: 'videos',
    },
    {
      id: 'groups',
      label: 'Groups',
      labelKey: 'common.nav.groups',
      href: '/groups',
      icon: 'groups',
    },
    {
      id: 'sessions',
      label: 'Sessions',
      labelKey: 'common.nav.sessions',
      href: '/sessions',
      icon: 'sessions',
    },
    {
      id: 'reports-expert',
      label: 'Report',
      labelKey: 'common.nav.report',
      href: '/reports/experts',
      icon: 'reports-expert',
    },
    {
      id: 'reports-student',
      label: 'Report',
      labelKey: 'common.nav.report',
      href: '/reports/students',
      icon: 'reports-student',
    },
    {
      id: 'invite-codes',
      label: 'Invite codes',
      labelKey: 'common.nav.inviteCodes',
      href: '/invite-codes',
      icon: 'invite-codes',
    },
  ],
  languages: DASHBOARD_LANGUAGES.map(({ value, label }) => ({ value, label })),
  overviewCards: [
    { label: 'Videos waiting', value: '12', delta: '+3' },
    { label: 'Reviews active', value: '5', delta: 'Today' },
    { label: 'Sessions booked', value: '8', delta: 'This week' },
  ],
  workQueue: [
    {
      title: 'Review student jumping form',
      meta: 'Uploaded to Academy group',
      status: 'To review',
      icon: 'video',
    },
    {
      title: 'Live coaching session',
      meta: 'Starts at 15:30',
      status: 'Upcoming',
      icon: 'sessions',
    },
    {
      title: 'Invite new group members',
      meta: 'Stable QR and link flow',
      status: 'Ready',
      icon: 'groups',
    },
  ],
};

export const AppShellStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    openWorkCount: computed(() => store.workQueue().length),
    activeNavigationItem: computed(() =>
      store.navigation().find((item) => item.id === store.activeSection()),
    ),
  })),
  withMethods((store, localization = inject(DashboardLocalizationService)) => {
    let toastTimeout: ReturnType<typeof setTimeout> | undefined;

    const dismissToast = (): void => {
      if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = undefined;
      }
      patchState(store, { isToastVisible: false });
    };

    return {
      closeNavigation(): void {
        patchState(store, { isNavigationOpen: false });
      },
      closeUserMenu(): void {
        patchState(store, { isUserMenuOpen: false });
      },
      closeNotifications(): void {
        patchState(store, { isNotificationsOpen: false });
      },
      toggleNotifications(): void {
        patchState(store, {
          isNotificationsOpen: !store.isNotificationsOpen(),
          isUserMenuOpen: false,
        });
      },
      dismissToast,
      showToast(title: string, message: string, type: ToastType = 'info'): void {
        dismissToast();
        patchState(store, {
          isToastVisible: true,
          toastMessage: message,
          toastTitle: title,
          toastType: type,
        });
        toastTimeout = setTimeout(dismissToast, 4000);
      },
      selectSection(section: string): void {
        patchState(store, {
          activeSection: section,
          isNavigationOpen: false,
        });
      },
      selectSectionForUrl(url: string): void {
        const segments = url.split('?')[0].split('/').filter(Boolean);
        const firstSegment = segments[0] ?? 'home';
        const sectionAliases: Record<string, string> = {
          asset: 'videos',
          'upload-video': 'videos',
          'create-group': 'groups',
        };
        let aliasedSection = sectionAliases[firstSegment] ?? firstSegment;
        // The two report routes share the `reports` segment; resolve to the
        // matching nav item so the right one highlights.
        if (firstSegment === 'reports') {
          aliasedSection = segments[1] === 'students' ? 'reports-student' : 'reports-expert';
        }
        const section = store.navigation().some((item) => item.id === aliasedSection)
          ? aliasedSection
          : 'home';

        patchState(store, {
          activeSection: section,
          isNavigationOpen: false,
        });
      },
      setLanguage(language: string): void {
        if (localization.isSupportedLanguage(language)) {
          const activeLanguage = localization.useLanguage(language);
          patchState(store, { activeLanguage });
        }
      },
      toggleNavigation(): void {
        patchState(store, { isNavigationOpen: !store.isNavigationOpen() });
      },
      toggleUserMenu(): void {
        patchState(store, {
          isUserMenuOpen: !store.isUserMenuOpen(),
          isNotificationsOpen: false,
        });
      },
    };
  }),
);
