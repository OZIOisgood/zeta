import { KeyboardAvoidingView, Modal, Platform, Pressable } from 'react-native';

import type { ZDialogPanelProps } from './z-dialog-panel.types';

export type { ZDialogPanelProps } from './z-dialog-panel.types';

/**
 * ZDialogPanel — NativeWind fallback (web / Storybook / jest).
 *
 * Reusable modal surface: a dimmed backdrop with a centered panel.
 * Mobile counterpart of the web dialog panel
 * (web/dashboard-next/src/app/shared/ui/dialog/). Tapping the backdrop closes;
 * tapping the panel does not. Consumers provide the panel content as children.
 *
 * The panel is wrapped in a `KeyboardAvoidingView` (padding behavior on iOS, where
 * the keyboard overlaps content) so dialogs that hold text inputs — e.g. the
 * availability session-type/blocked-date sheets — keep their fields and Save
 * button above the keyboard. (Android already resizes the window.)
 *
 * Native implementations:
 *   - z-dialog-panel.ios.tsx     → SwiftUI BottomSheet
 *   - z-dialog-panel.android.tsx → Compose ModalBottomSheet
 */
export function ZDialogPanel({
  visible,
  onClose,
  children,
  closeLabel = 'Close',
  testID,
}: ZDialogPanelProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel={closeLabel}
        onPress={onClose}
        className="flex-1 bg-black/40"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 items-center justify-center p-4"
        >
          <Pressable
            testID={testID}
            onPress={() => {}}
            className="w-full max-w-md rounded-lg border border-z-border bg-z-surface p-4"
          >
            {children}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
