import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

type NavigationItem = {
  id: string;
  label: string;
  href: string;
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
  navigation: NavigationItem[];
  overviewCards: OverviewCard[];
  workQueue: WorkQueueItem[];
};

const initialState: AppShellState = {
  activeLanguage: 'en',
  navigation: [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'videos', label: 'Videos', href: '/' },
    { id: 'groups', label: 'Groups', href: '/' },
    { id: 'sessions', label: 'Sessions', href: '/' },
  ],
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
  })),
  withMethods((store) => ({
    setLanguage(language: AppShellState['activeLanguage']): void {
      patchState(store, { activeLanguage: language });
    },
  })),
);
