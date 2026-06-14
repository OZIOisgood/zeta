/**
 * ZDialogPanel — iOS implementation (SwiftUI BottomSheet via @expo/ui/swift-ui).
 *
 * Renders a native SwiftUI `.sheet` via the `BottomSheet` component.
 * The sheet hosts arbitrary React Native children inline — the
 * public-API children prop is threaded straight into the BottomSheet body,
 * so all consumers (availability.tsx form sheets, ZConfirmDialog children)
 * work without modification.
 *
 * Sheet configuration:
 *   - detents: ['medium', 'large'] — standard iOS sheet sizing
 *   - fitToContents: false (detents override; content drives height via detent)
 *   - Drag indicator: visible (presentationDragIndicator)
 *   - Scrim: automatic (SwiftUI default)
 *   - Dismiss: user swipe-down or swipe-to-close triggers onIsPresentedChange(false)
 *     which maps to onClose.
 *
 * The Host wrapper with useViewportSizeMeasurement is NOT used here — the
 * BottomSheet component manages its own presentation; it does not need a Host.
 *
 * Known on-device uncertainties (device is the user's gate):
 *   - Keyboard + textarea: SwiftUI sheet handles keyboard avoidance natively
 *     (`.ignoresSafeArea(.keyboard, edges: .bottom)` is NOT set, so the sheet
 *     will push up when the keyboard appears). Verify on device.
 *   - Sheet sizing with fitToContents=false: the medium detent applies first;
 *     the user can drag to large. For tall forms this is correct. For short
 *     confirms with children the medium detent may leave excess whitespace.
 *
 * @expo/ui version: ~56.0.17
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/sheets
 */

import { BottomSheet, Group } from '@expo/ui/swift-ui';
import {
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';

import type { ZDialogPanelProps } from './z-dialog-panel.types';

export type { ZDialogPanelProps } from './z-dialog-panel.types';

export function ZDialogPanel({
  visible,
  onClose,
  children,
}: ZDialogPanelProps) {
  return (
    <BottomSheet
      isPresented={visible}
      onIsPresentedChange={(isPresented) => {
        if (!isPresented) onClose();
      }}
      onDismiss={onClose}
      fitToContents={false}
    >
      <Group
        modifiers={[
          presentationDetents(['medium', 'large']),
          presentationDragIndicator('visible'),
        ]}
      >
        {children}
      </Group>
    </BottomSheet>
  );
}
