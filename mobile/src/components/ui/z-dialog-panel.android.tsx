/**
 * ZDialogPanel — Android implementation (Compose ModalBottomSheet via
 * @expo/ui/jetpack-compose).
 *
 * Renders a Material Design modal bottom sheet that hosts arbitrary React
 * Native children inline. The public-API children prop is threaded directly
 * into the ModalBottomSheet body so all consumers (availability.tsx form
 * sheets, ZConfirmDialog children) work without modification.
 *
 * Sheet configuration:
 *   - showDragHandle: true  — Material 3 drag indicator
 *   - skipPartiallyExpanded: true — sheet opens full-height immediately;
 *     the Material 3 "partially expanded" state (≈50%) is skipped because
 *     form content (textareas, pickers) needs reliable full height
 *   - scrimColor: from theme surface overlay (system default when omitted)
 *   - containerColor / contentColor: from theme/native.ts role tokens
 *   - Dismiss: swipe down or back press triggers onDismissRequest → onClose
 *
 * ⚠️ Known Android BottomSheet scroll caveat (expo/expo#46379):
 *   React Native ScrollView / FlatList may NOT scroll inside the Compose
 *   ModalBottomSheet due to touch-intercept conflicts. Keep sheet content
 *   non-scrolling for this spike. A nested LazyColumn (Compose) would scroll
 *   correctly but cannot host arbitrary RN children.
 *
 * @expo/ui version: ~56.0.17
 * Material 3 reference: https://m3.material.io/components/bottom-sheets/overview
 */

import { Host, ModalBottomSheet } from '@expo/ui/jetpack-compose';

import { useRoleColors } from '../../theme/native';
import type { ZDialogPanelProps } from './z-dialog-panel.types';

export type { ZDialogPanelProps } from './z-dialog-panel.types';

export function ZDialogPanel({
  visible,
  onClose,
  children,
}: ZDialogPanelProps) {
  const { color } = useRoleColors();

  // Only render the ModalBottomSheet when visible; unmounting removes it from
  // the Compose hierarchy and avoids a persistent sheet in the compose tree.
  if (!visible) return null;

  return (
    <ModalBottomSheet
      onDismissRequest={onClose}
      showDragHandle
      skipPartiallyExpanded
      containerColor={color('surface')}
      contentColor={color('onSurface')}
    >
      {/*
       * Host wraps the RN children so they render inside the Compose sheet.
       * useViewportSizeMeasurement allows the content to fill the available
       * sheet height proposed by Compose.
       */}
      <Host useViewportSizeMeasurement>{children}</Host>
    </ModalBottomSheet>
  );
}
