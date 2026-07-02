import { useState } from 'react';
import { Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRoleColors } from '../../theme/native';
import { ZButton } from './z-button';
import { ZCard } from './z-card';
import { ZConfirmDialog } from './z-confirm-dialog';
import { ZIconTile } from './z-icon-tile';

/**
 * The single destructive-action card: a danger icon tile + title/description +
 * a danger button that opens a danger `ZConfirmDialog`. Shared by group-delete
 * (WP5) and account-delete (WP8). Counterpart of the web "danger zone" card.
 * `onAction` fires only after the user confirms. No raw rose-* / opacity-danger
 * styling — the danger surface comes from `ZIconTile`/`ZButton`/`ZConfirmDialog`.
 */
export function ZDangerZoneCard({
  title,
  description,
  actionLabel,
  onAction,
  loading = false,
  disabled = false,
  confirmTitle,
  confirmMessage,
  confirmLabel,
  testID,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  loading?: boolean;
  disabled?: boolean;
  confirmTitle: string;
  confirmMessage: string;
  confirmLabel: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { color } = useRoleColors();
  const [confirmVisible, setConfirmVisible] = useState(false);

  return (
    <ZCard testID={testID}>
      <View className="flex-row items-start gap-3">
        <ZIconTile tone="danger" icon={<AlertTriangle color={color('danger')} size={20} />} />
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-z-text">{title}</Text>
          <Text className="mt-1 text-sm leading-6 text-z-muted">{description}</Text>
        </View>
      </View>

      <View className="mt-4">
        <ZButton
          testID={testID ? `${testID}-action` : undefined}
          label={actionLabel}
          variant="danger"
          loading={loading}
          disabled={disabled}
          onPress={() => setConfirmVisible(true)}
        />
      </View>

      <ZConfirmDialog
        visible={confirmVisible}
        tone="danger"
        title={confirmTitle}
        description={confirmMessage}
        confirmLabel={confirmLabel}
        cancelLabel={t('common.actions.cancel')}
        confirmDisabled={loading}
        onConfirm={() => {
          setConfirmVisible(false);
          onAction();
        }}
        onCancel={() => setConfirmVisible(false)}
      />
    </ZCard>
  );
}
