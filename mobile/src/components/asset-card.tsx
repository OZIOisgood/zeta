import { Image, Pressable, Text, View } from 'react-native';
import { MessageSquare, Video as VideoIcon } from 'lucide-react-native';
import type { Asset } from '../api/queries/assets';

const STATUS_STYLES: Record<Asset['status'], { label: string; className: string }> = {
  waiting_upload: { label: 'Uploading', className: 'bg-z-surface-muted text-z-muted' },
  pending: { label: 'In review', className: 'bg-z-primary-soft text-z-primary-strong' },
  completed: { label: 'Reviewed', className: 'bg-z-surface-muted text-z-success' },
};

export function AssetCard({ asset, onPress }: { asset: Asset; onPress: () => void }) {
  const status = STATUS_STYLES[asset.status];
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
          <VideoIcon color="#735f4d" size={24} />
        )}
      </View>
      <View className="flex-1 gap-1">
        <Text numberOfLines={1} className="text-base font-semibold text-z-text">
          {asset.title}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text
            testID={`asset-status-${asset.status}`}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
          >
            {status.label}
          </Text>
          <View className="flex-row items-center gap-1">
            <MessageSquare color="#735f4d" size={14} />
            <Text className="text-xs text-z-muted">{asset.review_count}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
