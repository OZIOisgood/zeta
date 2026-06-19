import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Asset } from '../api/queries/assets';
import { colors } from '../theme/colors';
import { Touchable } from './ui/touchable';
import { ZBadge, type ZBadgeTone } from './ui/z-badge';
import { ZSymbol } from './ui/z-symbol';
import { ZVideoPreview } from './ui/z-video-preview';

const STATUS_TONE: Record<Asset['status'], ZBadgeTone> = {
  waiting_upload: 'neutral',
  pending: 'primary',
  completed: 'success',
};

/**
 * Video tile (Home "latest videos" + Videos list) — matches the handoff
 * `VideoTile`: a pressable row with a 100×66 landscape thumbnail (play/upload
 * overlay) on the left, then a content column holding title (15/700), the group
 * name (12.5/muted), and a status badge + comment count row — the badge + count
 * are LEFT-aligned in the content column, not a trailing slot.
 *
 * NOTE: the handoff overlays the clip duration on the thumbnail, but the `Asset`
 * API exposes no duration field — omitted rather than fabricated.
 */
export function AssetCard({ asset, onPress }: { asset: Asset; onPress: () => void }) {
  const { t } = useTranslation();
  const statusLabel =
    asset.status === 'waiting_upload'
      ? t('upload.uploading')
      : asset.status === 'pending'
        ? t('common.status.inReview')
        : t('common.status.reviewed');
  const secondaryLine = asset.group?.name || asset.description;
  const uploading = asset.status === 'waiting_upload';

  return (
    <Touchable
      testID={`asset-card-${asset.id}`}
      onPress={onPress}
      accessibilityLabel={asset.title}
      haptic
      className="flex-row items-center gap-3 rounded-2xl bg-surface p-[11px]"
    >
      <View className="relative h-[66px] w-[100px] overflow-hidden rounded-[14px]">
        <ZVideoPreview thumbnail={asset.thumbnail} alt={asset.title} />
        <View className="absolute inset-0 items-center justify-center">
          {uploading ? (
            <View testID="asset-upload-overlay">
              <ZSymbol name="file-video" label={t('upload.uploading')} size={22} color={colors.onPrimary} />
            </View>
          ) : (
            <View
              testID="asset-play-overlay"
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
            >
              <ZSymbol name="play" label={t('videos.title')} size={18} color={colors.onPrimary} />
            </View>
          )}
        </View>
      </View>

      <View className="flex-1 gap-[5px]">
        <Text numberOfLines={1} className="text-base font-bold text-z-text">
          {asset.title}
        </Text>
        {secondaryLine ? (
          <Text numberOfLines={1} className="text-xs font-medium text-z-muted">
            {secondaryLine}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-2">
          <ZBadge testID={`asset-status-${asset.status}`} label={statusLabel} tone={STATUS_TONE[asset.status]} />
          {asset.review_count > 0 ? (
            <View
              accessibilityLabel={t('videos.comments') + ': ' + asset.review_count}
              className="flex-row items-center gap-1"
            >
              <ZSymbol name="message" label={t('videos.comments')} size={14} color={colors.muted} />
              <Text className="text-xs font-bold text-z-muted">{asset.review_count}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Touchable>
  );
}
