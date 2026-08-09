/**
 * z-combobox.shared — platform-agnostic select store for ZCombobox.
 *
 * Shared by the three ZCombobox entry points:
 *   - z-combobox.tsx          — NativeWind fallback (web / Storybook / jest)
 *   - z-combobox.ios.tsx      — Native trigger
 *   - z-combobox.android.tsx  — Native trigger
 *
 * The native trigger variants (iOS/Android) push to /select/[field] and
 * communicate options + callback through this store — route params cannot hold
 * arrays or function references. The store is ephemeral (per-session); only
 * one combobox selection is active at a time.
 *
 * ⚠️  Platform siblings MUST import from './z-combobox.shared', NOT from
 * './z-combobox'. Metro resolves './z-combobox' to the platform file itself
 * (.ios.tsx / .android.tsx), causing an infinite self-re-export
 * ("Maximum call stack size exceeded").
 */
import { createStore } from 'zustand/vanilla';
import { useEffect, useState } from 'react';
import type { ZComboboxOption } from './z-combobox.types';

export type { ZComboboxOption } from './z-combobox.types';

export type SelectRequest = {
  /** Unique key for this combobox instance (e.g. "language", "timezone"). */
  fieldKey: string;
  /** All available options. */
  options: ZComboboxOption[];
  /** Currently selected value (highlights the active row). */
  value?: string;
  /** Callback fired when the user taps a row. Called before router.back(). */
  onSelect: (value: string) => void;
  /** Optional title for the pushed screen's header. */
  title?: string;
  /** Optional placeholder for the search field. */
  searchPlaceholder?: string;
};

type SelectState = {
  request: SelectRequest | null;
  open: (req: SelectRequest) => void;
  clear: () => void;
};

export const selectStore = createStore<SelectState>((set) => ({
  request: null,
  open: (req) => set({ request: req }),
  clear: () => set({ request: null }),
}));

/** Imperative API: push a select request from anywhere (called by the trigger). */
export function openSelect(req: SelectRequest): void {
  selectStore.getState().open(req);
}

/** React hook: subscribe to the active select request. */
export function useSelectRequest(): SelectRequest | null {
  const [request, setRequest] = useState(() => selectStore.getState().request);
  useEffect(() => selectStore.subscribe((state) => setRequest(state.request)), []);
  return request;
}
