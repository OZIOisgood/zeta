import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CloudOff, Video as VideoIcon } from 'lucide-react-native';
import { useAssetsQuery } from '../../api/queries/assets';
import { AssetCard } from '../../components/asset-card';
import { ZButton } from '../../components/ui/z-button';
import { ZSkeleton } from '../../components/ui/z-skeleton';

function ListSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} testID="asset-skeleton" className="flex-row gap-3 rounded-lg border border-z-border bg-z-surface p-3">
          <ZSkeleton className="h-16 w-24" />
          <View className="flex-1 justify-center gap-2">
            <ZSkeleton className="h-4 w-3/5" />
            <ZSkeleton className="h-3 w-2/5" />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function VideosScreen() {
  const router = useRouter();
  const { data, isPending, isError, refetch, isRefetching } = useAssetsQuery();

  if (isPending) return <View className="flex-1 bg-z-bg"><ListSkeleton /></View>;

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-z-bg px-8">
        <CloudOff color="#735f4d" size={32} />
        <Text className="text-center text-z-muted">Your videos could not be loaded.</Text>
        <ZButton label="Try again" variant="secondary" onPress={() => void refetch()} />
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View testID="videos-empty" className="flex-1 items-center justify-center gap-3 bg-z-bg px-8">
        <VideoIcon color="#735f4d" size={32} />
        <Text className="text-lg font-semibold text-z-text">No videos yet</Text>
        <Text className="text-center text-z-muted">Videos you upload appear here.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-z-bg">
      <FlatList
        data={data}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        renderItem={({ item }) => (
          <AssetCard asset={item} onPress={() => router.push(`/asset/${item.id}`)} />
        )}
      />
    </View>
  );
}
