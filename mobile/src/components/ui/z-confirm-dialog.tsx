import { Text, View } from 'react-native';
import { AlertTriangle, Info, Trash2 } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { ZButton } from './z-button';
import { ZDialogPanel } from './z-dialog-panel';

export type ZConfirmDialogTone = 'info' | 'warning' | 'danger';

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
 * Confirmation dialog. Mobile counterpart of the web `z-confirm-dialog`
 * (web/dashboard-next/src/app/shared/ui/dialog/). Renders a tone icon, title,
 * optional description, and a cancel/confirm footer inside a `ZDialogPanel`.
 */
export function ZConfirmDialog({
  visible,
  title,
  description,
  tone = 'info',
  confirmLabel,
  cancelLabel,
  confirmOnly = false,
  onConfirm,
  onCancel,
  testID,
}: {
  visible: boolean;
  title: string;
  description?: string;
  tone?: ZConfirmDialogTone;
  confirmLabel: string;
  cancelLabel?: string;
  confirmOnly?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}) {
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

      <View className="mt-6 flex-row justify-end gap-2">
        {!confirmOnly && cancelLabel ? (
          <ZButton label={cancelLabel} variant="secondary" onPress={onCancel} />
        ) : null}
        <ZButton
          label={confirmLabel}
          variant={tone === 'danger' ? 'danger' : 'primary'}
          onPress={onConfirm}
        />
      </View>
    </ZDialogPanel>
  );
}
