import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

type NavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: 'home' | 'videos' | 'groups' | 'sessions';
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

type AppShellState = {
  activeLanguage: 'en';
  activeSection: string;
  isNavigationOpen: boolean;
  isUserMenuOpen: boolean;
  isToastVisible: boolean;
  navigation: NavigationItem[];
  languages: { value: 'en'; label: string }[];
  overviewCards: OverviewCard[];
  workQueue: WorkQueueItem[];
};

const initialState: AppShellState = {
  activeLanguage: 'en',
  activeSection: 'home',
  isNavigationOpen: false,
  isUserMenuOpen: false,
  isToastVisible: true,
  navigation: [
    { id: 'home', label: 'Home', href: '/', icon: 'home' },
    { id: 'videos', label: 'Videos', href: '/', icon: 'videos' },
    { id: 'groups', label: 'Groups', href: '/', icon: 'groups' },
    { id: 'sessions', label: 'Sessions', href: '/', icon: 'sessions' },
  ],
  languages: [{ value: 'en', label: 'EN' }],
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
  withMethods((store) => ({
    closeNavigation(): void {
      patchState(store, { isNavigationOpen: false });
    },
    closeUserMenu(): void {
      patchState(store, { isUserMenuOpen: false });
    },
    dismissToast(): void {
      patchState(store, { isToastVisible: false });
    },
    selectSection(section: string): void {
      patchState(store, {
        activeSection: section,
        isNavigationOpen: false,
      });
    },
    setLanguage(language: string): void {
      if (language === 'en') {
        patchState(store, { activeLanguage: language });
      }
    },
    toggleNavigation(): void {
      patchState(store, { isNavigationOpen: !store.isNavigationOpen() });
    },
    toggleUserMenu(): void {
      patchState(store, { isUserMenuOpen: !store.isUserMenuOpen() });
    },
  })),
);
