import { Text, View } from 'react-native';
import { AlertTriangle, Info, Trash2 } from 'lucide-react-native';
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

/**
 * ZConfirmDialog — NativeWind fallback (web / Storybook / jest).
 *
 * Confirmation dialog. Mobile counterpart of the web `z-confirm-dialog`
 * (web/dashboard-next/src/app/shared/ui/dialog/). Renders a tone icon, title,
 * optional description, an optional content slot, and a cancel/confirm footer
 * inside a `ZDialogPanel`. Pass `children` to inject extra content (e.g. a
 * reason textarea) between the description and the footer buttons.
 *
 * Native implementations:
 *   - z-confirm-dialog.ios.tsx     → Alert (plain) + BottomSheet (with children)
 *   - z-confirm-dialog.android.tsx → AlertDialog (plain) + ModalBottomSheet (with children)
 */
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
