import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ArrowLeft, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAssetQuery } from '../../api/queries/assets';
import type { components } from '../../api/schema';
import { ZButton } from '../../components/ui/z-button';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { colors } from '../../theme/colors';

type AssetVideo = components['schemas']['AssetVideo'];

function streamUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

function Player({ video }: { video: AssetVideo }) {
  const player = useVideoPlayer(streamUrl(video.playback_id));
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} fullscreenOptions={{ enable: true }} />;
}

export default function AssetDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isPending, isError, refetch } = useAssetQuery(id ?? '');

  const playable = useMemo(
    () => (data?.videos ?? []).filter((v) => v.playback_id !== ''),
    [data],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = playable.find((v) => v.id === activeId) ?? playable[0] ?? null;

  if (isPending) {
    return (
      <ZScreen className="gap-4 p-4">
        <ZSkeleton testID="asset-detail-skeleton" className="aspect-video w-full" />
        <ZSkeleton className="h-5 w-3/5" />
        <ZSkeleton className="h-4 w-4/5" />
      </ZScreen>
    );
  }

  if (isError || !data) {
    return (
      <ZScreen className="items-center justify-center gap-4 px-8">
        <Text className="text-center text-z-muted">This video could not be loaded.</Text>
        <ZButton label={t('upload.retry')} variant="secondary" onPress={() => void refetch()} />
        <ZButton label={t('common.actions.back')} variant="ghost" onPress={() => router.back()} />
      </ZScreen>
    );
  }

  const processingParts = (data.videos ?? []).length - playable.length;

  return (
    // The video player stays edge-to-edge at the top; the content below it
    // never reaches the status bar, so only the bottom inset is needed.
    <ZScreen edges={['bottom']}>
      <ScrollView className="flex-1 bg-z-bg" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="aspect-video w-full items-center justify-center bg-black">
          {active ? (
            <Player key={active.id} video={active} />
          ) : (
            <View className="items-center gap-2">
              <Clock color={colors.bg} size={28} />
              <Text className="text-z-bg">Processing…</Text>
            </View>
          )}
        </View>
        <View className="gap-2 p-4">
          <View className="flex-row items-center gap-2">
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.actions.back')} onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={22} />
            </Pressable>
            <Text className="flex-1 text-xl font-semibold text-z-text" numberOfLines={2}>
              {data.title}
            </Text>
          </View>
          {data.description ? <Text className="text-z-muted">{data.description}</Text> : null}
          {playable.length > 1 ? (
            <View className="flex-row flex-wrap gap-2 pt-2">
              {playable.map((v, i) => (
                <Pressable
                  key={v.id}
                  accessibilityRole="button"
                  accessibilityLabel={t('videos.phase4.videoPart', { count: i + 1 })}
                  onPress={() => setActiveId(v.id)}
                  className={`rounded-full border px-3 py-1 ${
                    v.id === active?.id ? 'border-z-primary bg-z-primary-soft' : 'border-z-border bg-z-surface'
                  }`}
                >
                  <Text className="text-sm text-z-text">{t('videos.phase4.videoPart', { count: i + 1 })}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {processingParts > 0 ? (
            <Text className="text-sm text-z-muted">
              {processingParts} more part{processingParts > 1 ? 's' : ''} still processing.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </ZScreen>
  );
}
