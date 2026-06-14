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
import { useTranslation } from 'react-i18next';
import { Check, CircleAlert, Info, X } from 'lucide-react-native';
import { createStore } from 'zustand/vanilla';
import { colors } from '../../theme/colors';
import { ZIconButton } from './z-icon-button';

export type ZToastTone = 'success' | 'error' | 'info';

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

const containerClasses: Record<ZToastTone, string> = {
  success: 'border-green-200 bg-z-surface',
  error: 'border-rose-200 bg-z-surface',
  info: 'border-z-border bg-z-surface',
};

const iconClasses: Record<ZToastTone, string> = {
  success: 'bg-green-50',
  error: 'bg-rose-50',
  info: 'bg-z-surface-warm',
};

const iconColors: Record<ZToastTone, string> = {
  success: colors.success,
  error: colors.danger,
  info: colors.primary,
};

const ToastIcon = {
  success: Check,
  error: CircleAlert,
  info: Info,
} as const;

/** Presentational toast card (web counterpart: the standalone `z-toast`). Exported
 *  so stories/tests can render a toast without driving the auto-dismissing store. */
export function ToastCard({ toast, onDismiss }: { toast: ZToast; onDismiss: (id: number) => void }) {
  const { t } = useTranslation();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const Icon = ToastIcon[toast.tone];

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
      className={`flex-row items-start gap-3 rounded-lg border p-4 ${containerClasses[toast.tone]}`}
    >
      <View
        className={`h-8 w-8 items-center justify-center rounded-md ${iconClasses[toast.tone]}`}
      >
        <Icon color={iconColors[toast.tone]} size={20} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-z-text">{toast.title}</Text>
        {toast.message ? (
          <Text className="mt-1 text-sm leading-5 text-z-muted">{toast.message}</Text>
        ) : null}
      </View>
      <ZIconButton label={t('common.dismiss')} size="sm" onPress={() => onDismiss(toast.id)}>
        <X color={colors.muted} size={16} />
      </ZIconButton>
    </View>
  );
}
