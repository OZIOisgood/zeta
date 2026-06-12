import { Image, Pressable, Text, View } from 'react-native';
import { MessageSquare, Video as VideoIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Asset } from '../api/queries/assets';
import { colors } from '../theme/colors';

const STATUS_CLASS: Record<Asset['status'], string> = {
  waiting_upload: 'bg-z-surface-muted text-z-muted',
  pending: 'bg-z-primary-soft text-z-primary-strong',
  completed: 'bg-z-surface-muted text-z-success',
};

export function AssetCard({ asset, onPress }: { asset: Asset; onPress: () => void }) {
  const { t } = useTranslation();
  const statusClass = STATUS_CLASS[asset.status];
  const statusLabel =
    asset.status === 'waiting_upload'
      ? 'Uploading'
      : asset.status === 'pending'
        ? t('videos.reviewStatus.inReview')
        : t('videos.reviewStatus.reviewed');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={asset.title}
      onPress={onPress}
      className="mb-3 flex-row items-center gap-3 rounded-lg border border-z-border bg-z-surface p-3 active:bg-z-surface-warm"
    >
      <View className="h-16 w-24 items-center justify-center overflow-hidden rounded-md bg-z-surface-muted">
        {asset.thumbnail ? (
          <Image source={{ uri: asset.thumbnail }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <VideoIcon color={colors.muted} size={24} />
        )}
      </View>
      <View className="flex-1 gap-1">
        <Text numberOfLines={1} className="text-base font-semibold text-z-text">
          {asset.title}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text
            testID={`asset-status-${asset.status}`}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
          >
            {statusLabel}
          </Text>
          <View className="flex-row items-center gap-1">
            <MessageSquare color={colors.muted} size={14} />
            <Text className="text-xs text-z-muted">{asset.review_count}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
