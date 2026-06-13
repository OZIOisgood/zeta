import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ArrowLeft, Clock, MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAssetQuery } from '../../api/queries/assets';
import { useCreateReviewMutation, useReviewsQuery } from '../../api/queries/reviews';
import type { CreateReviewInput, Review } from '../../api/queries/reviews';
import type { components } from '../../api/schema';
import { useAuth } from '../../auth/auth-store';
import { initialsFromName } from '../../lib/avatar';
import { ReviewComposer } from '../../components/review-composer';
import { ReviewItem } from '../../components/review-item';
import { ZAvatar } from '../../components/ui/z-avatar';
import { ZBadge } from '../../components/ui/z-badge';
import { ZButton } from '../../components/ui/z-button';
import { ZCard } from '../../components/ui/z-card';
import { ZChip } from '../../components/ui/z-chip';
import { ZEmptyState } from '../../components/ui/z-empty-state';
import { ZIconButton } from '../../components/ui/z-icon-button';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { colors } from '../../theme/colors';

type AssetVideo = components['schemas']['AssetVideo'];

function streamUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

// ── Player ───────────────────────────────────────────────────────────────────

function Player({
  video,
  onPlayer,
}: {
  video: AssetVideo;
  onPlayer?: (player: ReturnType<typeof useVideoPlayer>) => void;
}) {
  const player = useVideoPlayer(streamUrl(video.playback_id));

  useEffect(() => {
    onPlayer?.(player);
  }, [player, onPlayer]);

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      fullscreenOptions={{ enable: true }}
    />
  );
}

// ── Reviews section ──────────────────────────────────────────────────────────

function ReviewsSkeleton() {
  return (
    <View className="gap-3">
      <ZSkeleton className="h-14 w-full" />
      <ZSkeleton className="h-14 w-full" />
      <ZSkeleton className="h-14 w-full" />
    </View>
  );
}

type ReviewsSectionProps = {
  videoId: string;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  canCompose: boolean;
};

function ReviewsSection({ videoId, seekTo, getCurrentTime, canCompose }: ReviewsSectionProps) {
  const { t } = useTranslation();
  const [replyingTo, setReplyingTo] = useState<Review | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useReviewsQuery(videoId);
  const { mutateAsync } = useCreateReviewMutation(videoId);

  // Thread: top-level reviews sorted by created_at ASC
  const topLevel = useMemo(
    () =>
      (data ?? [])
        .filter((r) => !r.parent_id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [data],
  );

  // Replies grouped by parent id
  const repliesByParent = useMemo(() => {
    const map = new Map<string, Review[]>();
    for (const r of data ?? []) {
      if (r.parent_id) {
        const arr = map.get(r.parent_id) ?? [];
        arr.push(r);
        map.set(r.parent_id, arr);
      }
    }
    // sort each group ASC
    for (const [, arr] of map) {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return map;
  }, [data]);

  async function handleSubmit(input: CreateReviewInput) {
    setMutationError(null);
    try {
      await mutateAsync(input);
      setReplyingTo(null);
    } catch {
      setMutationError(t('videos.phase4.commentsFailed'));
    }
  }

  return (
    <ZCard className="gap-4">
      <View className="flex-row items-center gap-2">
        <MessageCircle color={colors.primary} size={18} />
        <Text className="text-sm font-semibold text-z-text">{t('videos.comments')}</Text>
        <ZBadge label={String(topLevel.length)} />
      </View>

      {isPending && <ReviewsSkeleton />}

      {isError && (
        <View className="items-start gap-2">
          <Text className="text-sm text-z-muted">{t('videos.phase4.commentsFailed')}</Text>
          <ZButton label={t('common.actions.retry')} variant="secondary" onPress={() => void refetch()} />
        </View>
      )}

      {!isPending && !isError && topLevel.length === 0 && (
        <ZEmptyState
          title={t('videos.noComments')}
          description={canCompose ? t('videos.leaveComment') : t('videos.reviewerNoComments')}
        />
      )}

      {!isPending &&
        !isError &&
        topLevel.map((review) => (
          <View key={review.id} className="gap-2">
            <ReviewItem
              review={review}
              onSeek={seekTo}
              onReply={(r) => setReplyingTo(r)}
            />
            {(repliesByParent.get(review.id) ?? []).map((reply) => (
              <ReviewItem key={reply.id} review={reply} onSeek={seekTo} isReply />
            ))}
          </View>
        ))}

      {canCompose && (
        <View className="gap-1">
          <ReviewComposer
            onSubmit={handleSubmit}
            getCurrentTime={replyingTo ? undefined : getCurrentTime}
            replyingTo={replyingTo ?? undefined}
            onCancelReply={() => setReplyingTo(null)}
          />
          {mutationError ? (
            <Text className="text-sm text-z-danger">{mutationError}</Text>
          ) : null}
        </View>
      )}
    </ZCard>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function AssetDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isPending, isError, refetch } = useAssetQuery(id ?? '');

  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const canCompose = (permissions?.includes('reviews:create') ?? false) && data?.status !== 'completed';

  // Player ref for seeking
  const playerRef = useRef<ReturnType<typeof useVideoPlayer> | null>(null);

  function seekTo(seconds: number) {
    const p = playerRef.current;
    if (p) {
      p.currentTime = seconds;
      p.play?.();
    }
  }

  function getCurrentTime() {
    return playerRef.current?.currentTime ?? 0;
  }

  const playable = useMemo(
    () => (data?.videos ?? []).filter((v) => v.playback_id !== ''),
    [data],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = playable.find((v) => v.id === activeId) ?? playable[0] ?? null;

  const handlePlayer = useCallback(
    (p: ReturnType<typeof useVideoPlayer>) => {
      playerRef.current = p;
    },
    [],
  );

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
        <Text className="text-center text-z-muted">{t('videos.phase4.detailFailed')}</Text>
        <ZButton label={t('common.actions.retry')} variant="secondary" onPress={() => void refetch()} />
        <ZButton label={t('common.actions.back')} variant="ghost" onPress={() => router.back()} />
      </ZScreen>
    );
  }

  const videos = data.videos ?? [];
  const processingParts = videos.length - playable.length;
  const group = data.group;

  return (
    // The video player stays edge-to-edge at the top; the content below it
    // never reaches the status bar, so only the bottom inset is needed.
    <ZScreen edges={['bottom']}>
      <ScrollView className="flex-1 bg-z-bg" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="aspect-video w-full items-center justify-center bg-black">
          {active ? (
            <Player
              key={active.id}
              video={active}
              onPlayer={handlePlayer}
            />
          ) : (
            <View className="items-center gap-2">
              <Clock color={colors.bg} size={28} />
              <Text className="text-z-bg">{t('videos.processingUnavailable')}</Text>
            </View>
          )}
        </View>

        <View className="gap-4 p-4">
          {/* Back row — the prominent title lives in the metadata card below. */}
          <View className="flex-row items-center">
            <ZIconButton label={t('common.actions.back')} onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={22} />
            </ZIconButton>
          </View>

          {/* Metadata card: status, title, group, description. */}
          <ZCard className="gap-3">
            <ZBadge
              label={
                data.status === 'completed'
                  ? t('common.status.reviewed')
                  : t('common.status.inReview')
              }
              tone={data.status === 'completed' ? 'success' : 'primary'}
            />
            <Text className="text-xl font-semibold text-z-text" numberOfLines={2}>
              {data.title}
            </Text>
            {group ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/group/${group.id}`)}
                className="flex-row items-center gap-2"
              >
                <ZAvatar image={group.avatar} fallback={initialsFromName(group.name)} size={36} alt={group.name} />
                <Text className="flex-1 text-sm font-semibold text-z-primary" numberOfLines={1}>
                  {group.name}
                </Text>
              </Pressable>
            ) : null}
            <Text className="text-sm text-z-muted">
              {data.description ? data.description : t('videos.phase4.noDescription')}
            </Text>
          </ZCard>

          {/* Video-parts card. */}
          {videos.length > 0 ? (
            <ZCard className="gap-3">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-semibold text-z-text">
                  {t('videos.phase4.videoParts')}
                </Text>
                <ZBadge label={String(videos.length)} />
              </View>
              <View className="gap-2">
                {videos.map((v, i) => {
                  const isPlayable = v.playback_id !== '';
                  return (
                    <View key={v.id} className="flex-row items-center justify-between gap-3">
                      <ZChip
                        label={t('videos.phase4.videoPart', { count: i + 1 })}
                        selected={isPlayable && v.id === active?.id}
                        disabled={!isPlayable}
                        onPress={isPlayable ? () => setActiveId(v.id) : undefined}
                      />
                      <View className="flex-1 flex-row items-center justify-end gap-2">
                        <Text className="text-xs text-z-muted" numberOfLines={1}>
                          {v.status}
                        </Text>
                        <ZBadge label={String(v.review_count)} />
                      </View>
                    </View>
                  );
                })}
              </View>
              {processingParts > 0 ? (
                <Text className="text-sm text-z-muted">
                  {processingParts} more part{processingParts > 1 ? 's' : ''} still processing.
                </Text>
              ) : null}
            </ZCard>
          ) : null}

          {/* Comments card. */}
          {active ? (
            <ReviewsSection
              key={active.id}
              videoId={active.id}
              seekTo={seekTo}
              getCurrentTime={getCurrentTime}
              canCompose={canCompose}
            />
          ) : null}
        </View>
      </ScrollView>
    </ZScreen>
  );
}
