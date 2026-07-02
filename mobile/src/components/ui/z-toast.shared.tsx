/**
 * z-toast.shared — platform-agnostic toast store + presentational card.
 *
 * Shared by the three ZToastHost entry points (z-toast.tsx web fallback,
 * z-toast.android.tsx, z-toast.ios.tsx). This lives in a NON-platform file on
 * purpose: a platform entry (e.g. z-toast.android.tsx) must NOT import these
 * from './z-toast', because Metro resolves './z-toast' to the platform file
 * itself (`.android.tsx`/`.ios.tsx` win over `.tsx`), causing an infinite
 * self-re-export ("Maximum call stack size exceeded"). Importing from
 * './z-toast.shared' resolves unambiguously on every platform.
 *
 * Only ZToastHost is platform-specific; everything here (store, showToast,
 * useToasts, ToastCard, types) is shared and unchanged.
 */
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { createStore } from 'zustand/vanilla';

export type ZToastTone = 'success' | 'error' | 'info';

// No `action` field: an accent Snackbar action was plumbed through here once
// but neither show() nor showToast() could ever set one — dead speculative
// API, removed (YAGNI). Re-add end-to-end (store → hosts) when a feature
// actually needs an "Undo".
export type ZToast = {
  id: number;
  title: string;
  message?: string;
  tone: ZToastTone;
};

/** How long a toast stays on screen before it auto-dismisses. */
const AUTO_DISMISS_MS = 3000;

type ToastState = {
  toasts: ZToast[];
  show: (title: string, message?: string, tone?: ZToastTone) => number;
  dismiss: (id: number) => void;
};

let nextId = 0;

export const toastStore = createStore<ToastState>((set) => ({
  toasts: [],
  show: (title, message, tone = 'info') => {
    const id = ++nextId;
    set((state) => ({
      toasts: [...state.toasts, { id, title, message, tone }],
    }));
    return id;
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

/** Imperative API: show a toast from anywhere (mirrors the web `showToast`). */
export function showToast(title: string, message?: string, tone?: ZToastTone): number {
  return toastStore.getState().show(title, message, tone);
}

/** Subscribes a component to the active toasts. */
export function useToasts(): ZToast[] {
  const [toasts, setToasts] = useState(() => toastStore.getState().toasts);
  useEffect(() => toastStore.subscribe((state) => setToasts(state.toasts)), []);
  return toasts;
}

/**
 * Tone → leading status-dot color. The pill body is the M3 inverse surface
 * (`bg-on-surface` / `text-surface`); the dot carries the only semantic tint,
 * so the dark pill reads as success / error / neutral at a glance.
 */
const dotClasses: Record<ZToastTone, string> = {
  success: 'bg-role-success',
  error: 'bg-role-danger',
  info: 'bg-surface-variant',
};

/**
 * Presentational toast pill — the M3 dark inverse-surface snackbar (web
 * counterpart: the standalone `z-toast`). Single line, no dismiss control
 * (auto-dismiss only), intrinsic width (the host positions it). Exported so
 * stories/tests can render a toast without driving the auto-dismissing store.
 */
export function ToastCard({ toast, onDismiss }: { toast: ZToast; onDismiss: (id: number) => void }) {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timeout.current = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [toast.id, onDismiss]);

  return (
    <View
      testID={`toast-${toast.id}`}
      accessibilityRole="alert"
      className="w-auto max-w-full self-center flex-row items-center gap-3 rounded bg-on-surface px-4 py-3"
    >
      <View className={`h-2.5 w-2.5 rounded-full ${dotClasses[toast.tone]}`} />
      <View className="min-w-0 flex-1">
        <Text className="text-sm text-surface" numberOfLines={1}>
          <Text className="font-semibold text-surface">{toast.title}</Text>
          {toast.message ? <Text className="text-surface">{`  ${toast.message}`}</Text> : null}
        </Text>
      </View>
    </View>
  );
}
