import type { ReactNode } from 'react';
import { Modal, Pressable } from 'react-native';

/**
 * Reusable modal surface: a dimmed backdrop with a centered panel.
 * Mobile counterpart of the web dialog panel
 * (web/dashboard-next/src/app/shared/ui/dialog/). Tapping the backdrop closes;
 * tapping the panel does not. Consumers provide the panel content as children.
 */
export function ZDialogPanel({
  visible,
  onClose,
  children,
  closeLabel = 'Close',
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  closeLabel?: string;
  testID?: string;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel={closeLabel}
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/40 p-4"
      >
        <Pressable
          testID={testID}
          onPress={() => {}}
          className="w-full max-w-md rounded-lg border border-z-border bg-z-surface p-4"
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
