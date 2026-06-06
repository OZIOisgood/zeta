import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import {
  ReportEvent,
  ReportRef,
  ReportRole,
  ReportsApiClient,
} from '../../core/http/reports-api.service';
import {
  AsyncSlice,
  errorAsyncSlice,
  idleAsyncSlice,
  loadingAsyncSlice,
  successAsyncSlice,
} from '../../core/state/async-state';
import {
  buildReport,
  canStepForward,
  currentCursor,
  Cursor,
  Granularity,
  isCurrentPeriod,
  stepCursor,
} from './reports.util';

type ReportsState = AsyncSlice & {
  role: ReportRole | null;
  viewer: ReportRef | null;
  events: ReportEvent[];
  gran: Granularity;
  cursor: Cursor;
};

const initialState: ReportsState = {
  ...idleAsyncSlice(),
  role: null,
  viewer: null,
  events: [],
  gran: 'month',
  cursor: currentCursor(new Date()),
};

export const ReportsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    report: computed(() =>
      buildReport(store.role() ?? 'expert', store.events(), store.gran(), store.cursor()),
    ),
    atCurrentPeriod: computed(() => isCurrentPeriod(store.gran(), store.cursor(), new Date())),
    canStepForward: computed(() => canStepForward(store.gran(), store.cursor(), new Date())),
  })),
  withMethods((store, api = inject(ReportsApiClient)) => ({
    async load(): Promise<void> {
      patchState(store, loadingAsyncSlice());
      try {
        const res = await firstValueFrom(api.events());
        patchState(store, {
          ...successAsyncSlice(),
          role: res.role,
          viewer: res.viewer,
          events: res.events,
        });
      } catch (error) {
        patchState(store, errorAsyncSlice(error));
      }
    },

    // Seed the perspective from the route so the page renders the right title and
    // nesting before the events load. load() then confirms it from the API.
    setRole(role: ReportRole): void {
      patchState(store, { role });
    },

    setGran(gran: Granularity): void {
      patchState(store, { gran });
    },

    stepBack(): void {
      patchState(store, { cursor: stepCursor(store.gran(), store.cursor(), -1) });
    },

    stepForward(): void {
      if (!canStepForward(store.gran(), store.cursor(), new Date())) return;
      patchState(store, { cursor: stepCursor(store.gran(), store.cursor(), 1) });
    },

    resetToday(): void {
      patchState(store, { cursor: currentCursor(new Date()) });
    },
  })),
);
