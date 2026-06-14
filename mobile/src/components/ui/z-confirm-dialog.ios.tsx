/**
 * ZConfirmDialog — iOS implementation (SwiftUI via @expo/ui/swift-ui).
 *
 * Routing logic:
 *   - No `children` → native SwiftUI Alert (system modal popup):
 *       title  = dialog title
 *       message (Alert.Message) = description
 *       actions (Alert.Actions):
 *         cancel Button (role='cancel') when !confirmOnly
 *         confirm Button (role='destructive' when danger, else default)
 *       Driven by isPresented=visible; onIsPresentedChange(false) → onCancel.
 *       Confirm button calls onConfirm + leaves isPresented management to caller.
 *       The Alert is housed in a Host with matchContents so it occupies no screen
 *       space when not presented.
 *
 *   - With `children` → ZDialogPanel (native SwiftUI BottomSheet) hosting the
 *       full dialog body: icon + title + description + children + cancel/confirm
 *       footer. Matches the fallback layout so consumers (coaching.tsx cancel
 *       reason textarea) get the same information hierarchy.
 *       Never disables the confirm button for an empty reason (input is optional).
 *
 * Public API is identical to the bare .tsx fallback → coaching.tsx, asset/[id].tsx,
 * and availability.tsx MUST remain unchanged.
 *
 * On-device uncertainties:
 *   - Alert destructive button: SwiftUI renders role='destructive' in system red.
 *     Confirm on device that the cancelLabel button appears as cancel (system blue)
 *     and the confirm button appears red when tone==='danger'.
 *   - confirmDisabled: Swift Alert buttons cannot be disabled natively; when
 *     confirmDisabled is true we still render the button but the onConfirm guard
 *     in the caller (mutation in-flight) prevents double-fire. This is a known
 *     limitation of the SwiftUI Alert API — no button-disable prop exists.
 *   - Keyboard with textarea in the sheet: SwiftUI sheet handles keyboard avoidance
 *     natively; verify on device that the textarea stays above the keyboard.
 *   - Sheet sizing: 'medium' detent is the initial height. For the booking-cancel
 *     form (ZTextarea + error text) the medium detent should be sufficient, but
 *     verify on device.
 *
 * @expo/ui version: ~56.0.17
 * HIG Alert: https://developer.apple.com/design/human-interface-guidelines/alerts
 * HIG Sheet: https://developer.apple.com/design/human-interface-guidelines/sheets
 */

import { Alert, Button, Host, Text as SwiftText } from '@expo/ui/swift-ui';
import { AlertTriangle, Info, Trash2 } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { ZButton } from './z-button';
import { ZDialogPanel } from './z-dialog-panel';
import type { ZConfirmDialogProps, ZConfirmDialogTone } from './z-confirm-dialog.types';

export type { ZConfirmDialogTone, ZConfirmDialogProps } from './z-confirm-dialog.types';

const toneIcon = {
  info: Info,
  warning: AlertTriangle,
  danger: Trash2,
} as const;

const toneIconClasses: Record<ZConfirmDialogTone, string> = {
  info: 'bg-z-primary-soft',
  warning: 'bg-amber-50',
  danger: 'bg-rose-50',
};

const toneIconColors: Record<ZConfirmDialogTone, string> = {
  info: colors.primary,
  warning: colors.warning,
  danger: colors.danger,
};

export function ZConfirmDialog({
  visible,
  title,
  description,
  tone = 'info',
  confirmLabel,
  cancelLabel,
  confirmOnly = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
  testID,
}: ZConfirmDialogProps) {
  // --- BRANCH: children present → native BottomSheet ---
  if (children != null) {
    const Icon = toneIcon[tone];

    return (
      <ZDialogPanel visible={visible} onClose={onCancel} testID={testID}>
        <View className="flex-row items-start gap-3">
          <View
            className={`h-10 w-10 items-center justify-center rounded-md ${toneIconClasses[tone]}`}
          >
            <Icon color={toneIconColors[tone]} size={20} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold leading-6 text-z-text">{title}</Text>
            {description ? (
              <Text className="mt-2 text-sm leading-6 text-z-muted">{description}</Text>
            ) : null}
          </View>
        </View>

        {children}

        <View className="mt-6 flex-row justify-end gap-2">
          {!confirmOnly && cancelLabel ? (
            <ZButton label={cancelLabel} variant="secondary" onPress={onCancel} />
          ) : null}
          <ZButton
            label={confirmLabel}
            variant={tone === 'danger' ? 'danger' : 'primary'}
            disabled={confirmDisabled}
            onPress={onConfirm}
          />
        </View>
      </ZDialogPanel>
    );
  }

  // --- BRANCH: no children → native SwiftUI Alert ---
  // The Alert needs a Host parent to bridge into SwiftUI context. We use
  // matchContents so the Host occupies zero layout space when not presented.
  const isDestructive = tone === 'danger';

  return (
    <Host matchContents>
      <Alert
        title={title}
        isPresented={visible}
        onIsPresentedChange={(isPresented) => {
          // SwiftUI dismisses the alert (e.g. tapping outside on iPad, or
          // system back). Map to onCancel so caller's visible state is reset.
          if (!isPresented) onCancel();
        }}
      >
        {description ? (
          <Alert.Message>
            {/* SwiftUI Text is required inside Alert.Message — RN Text is not renderable in a SwiftUI slot */}
            <SwiftText>{description}</SwiftText>
          </Alert.Message>
        ) : null}
        <Alert.Actions>
          {!confirmOnly && cancelLabel ? (
            <Button role="cancel" onPress={onCancel} label={cancelLabel} />
          ) : null}
          <Button
            role={isDestructive ? 'destructive' : 'default'}
            onPress={confirmDisabled ? undefined : onConfirm}
            label={confirmLabel}
          />
        </Alert.Actions>
      </Alert>
    </Host>
  );
}
