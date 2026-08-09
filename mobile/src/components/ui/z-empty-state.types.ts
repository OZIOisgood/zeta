/**
 * ZEmptyState — shared public API types (Tier: Native)
 *
 * Platform variants:
 *   - z-empty-state.tsx          — NativeWind fallback (web / Storybook / jest)
 *   - z-empty-state.ios.tsx      — @expo/ui/swift-ui ContentUnavailableView
 *   - z-empty-state.android.tsx  — role-token-styled RN column (Custom-RN tier
 *                                  inside a Native-tier primitive; no Compose
 *                                  equivalent for ContentUnavailableView)
 *
 * iOS ContentUnavailableView note:
 *   - Accepts `title`, `description`, `systemImage` (SF Symbol name).
 *   - Does NOT have a children / actions slot in the @expo/ui API.
 *   - When `children` (action slot) is provided, it is rendered as a RN View
 *     below the ContentUnavailableView (outside the native widget) so retry
 *     buttons are still visible and accessible.
 *   - The `icon` prop (arbitrary ReactNode) is not supported by
 *     ContentUnavailableView; if `iconSystemImage` is provided it maps to
 *     `systemImage`; otherwise the default SF Symbol is used.
 */

import type { ReactNode } from 'react';

export type ZEmptyStateProps = {
  /** Short title explaining why the content is unavailable. */
  title: string;
  /** Longer explanation shown below the title. */
  description: string;
  /**
   * Optional icon node (lucide icon, etc.) used in the bare fallback and
   * Android implementation. For iOS pass `iconSystemImage` instead.
   * @default Inbox icon
   */
  icon?: ReactNode;
  /**
   * SF Symbol name for the iOS ContentUnavailableView `systemImage` prop.
   * Uses a plain `string` type to avoid a hard dependency on
   * `sf-symbols-typescript` (a transitive dep inside @expo/ui). Pass a valid
   * SF Symbol name string (e.g. "exclamationmark.icloud").
   * When omitted the system picks the default symbol.
   */
  iconSystemImage?: string;
  /**
   * Optional action slot rendered below the description (e.g. a retry button).
   * In the iOS native variant this appears below the ContentUnavailableView
   * since the API does not expose an actions slot.
   */
  children?: ReactNode;
};
