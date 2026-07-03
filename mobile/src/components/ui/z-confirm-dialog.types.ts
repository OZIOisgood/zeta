/**
 * ZConfirmDialog — shared public API types (Tier: Native)
 *
 * These types are shared across all platform variants:
 *   - z-confirm-dialog.tsx          — ZDialogPanel-based fallback (web / Storybook / jest)
 *   - z-confirm-dialog.ios.tsx      — Alert (plain) + BottomSheet (with children) via @expo/ui/swift-ui
 *   - z-confirm-dialog.android.tsx  — AlertDialog (plain) + ModalBottomSheet (with children) via @expo/ui/jetpack-compose
 *
 * Routing logic (shared across native implementations):
 *   - No `children` → native system Alert/AlertDialog: title, message, confirm + cancel buttons.
 *     `tone === 'danger'` → destructive/red confirm. `confirmOnly` → single button.
 *   - With `children` → ZDialogPanel (native BottomSheet) hosting icon + title +
 *     description + children + footer inline.
 *
 * The bare .tsx fallback is the contract doc and test surface. Consumers (coaching.tsx,
 * asset/[id].tsx, availability.tsx, group/[id].tsx) import from 'z-confirm-dialog'
 * and must remain unchanged across all variants.
 */

import type { ReactNode } from 'react';

export type ZConfirmDialogTone = 'info' | 'warning' | 'danger';

export type ZConfirmDialogProps = {
  /** Whether the dialog is visible / presented. */
  visible: boolean;
  /** Dialog title. */
  title: string;
  /** Optional descriptive body text shown below the title. */
  description?: string;
  /** Visual/semantic tone. Affects the icon and confirm button color.
   * @default 'info'
   */
  tone?: ZConfirmDialogTone;
  /** Label for the confirm / primary action button. */
  confirmLabel: string;
  /** Label for the cancel / secondary button. Required unless confirmOnly. */
  cancelLabel?: string;
  /**
   * When true, only the confirm button is shown (no cancel).
   * Use for informational one-button dialogs.
   * @default false
   */
  confirmOnly?: boolean;
  /**
   * When true, the confirm button is disabled (e.g. an in-flight mutation).
   * @default false
   */
  confirmDisabled?: boolean;
  /** Called when the user presses the confirm button. */
  onConfirm: () => void;
  /** Called when the user cancels or dismisses the dialog. */
  onCancel: () => void;
  /**
   * Optional content rendered between the description and the footer buttons.
   * When present, the dialog is presented as a bottom sheet (native sheet) instead
   * of a native Alert, because Alert cannot host arbitrary React children.
   * Example: a ZTextarea for a cancellation reason.
   */
  children?: ReactNode;
  /** Test identifier forwarded to the dialog container. */
  testID?: string;
};
