import { Pressable, Text, View } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Asset } from '../api/queries/assets';
import { colors } from '../theme/colors';
import { ZBadge, type ZBadgeTone } from './ui/z-badge';
import { ZVideoPreview } from './ui/z-video-preview';

const STATUS_TONE: Record<Asset['status'], ZBadgeTone> = {
  waiting_upload: 'neutral',
  pending: 'primary',
  completed: 'success',
};

export function AssetCard({ asset, onPress }: { asset: Asset; onPress: () => void }) {
  const { t } = useTranslation();
  const statusLabel =
    asset.status === 'waiting_upload'
      ? t('upload.uploading')
      : asset.status === 'pending'
        ? t('common.status.inReview')
        : t('common.status.reviewed');
  // Mirror the web card's single secondary line so the group name never renders
  // twice: prefer the group accent, fall back to the description.
  const secondaryLine = asset.group?.name || asset.description;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={asset.title}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-lg border border-z-border bg-z-surface p-3 active:bg-z-surface-warm"
    >
      <View className="h-16 w-24 overflow-hidden rounded-md">
        <ZVideoPreview thumbnail={asset.thumbnail} alt={asset.title} />
      </View>
      <View className="flex-1 gap-1">
        <Text numberOfLines={1} className="text-base font-semibold text-z-text">
          {asset.title}
        </Text>
        {secondaryLine ? (
          <Text numberOfLines={1} className="text-sm text-z-muted">
            {secondaryLine}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-2">
          <ZBadge
            testID={`asset-status-${asset.status}`}
            label={statusLabel}
            tone={STATUS_TONE[asset.status]}
          />
          <View
            accessibilityLabel={t('videos.comments') + ': ' + asset.review_count}
            className="flex-row items-center gap-1"
          >
            <MessageSquare color={colors.muted} size={14} />
            <Text className="text-xs text-z-muted">{asset.review_count}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
