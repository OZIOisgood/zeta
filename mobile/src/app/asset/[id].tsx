import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { useAssetQuery, useFinalizeAssetMutation } from '../../api/queries/assets';
import {
  useCreateReviewMutation,
  useDeleteReviewMutation,
  useEnhanceReviewTextMutation,
  useReviewsQuery,
  useUpdateReviewMutation,
} from '../../api/queries/reviews';
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
import { ZConfirmDialog } from '../../components/ui/z-confirm-dialog';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { showToast } from '../../components/ui/z-toast';
import { ZSymbol } from '../../components/ui/z-symbol';
import { Touchable } from '../../components/ui/touchable';
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
  canEdit: boolean;
  canDelete: boolean;
};

function ReviewsSection({ videoId, seekTo, getCurrentTime, canCompose, canEdit, canDelete }: ReviewsSectionProps) {
  const { t } = useTranslation();
  const [replyingTo, setReplyingTo] = useState<Review | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useReviewsQuery(videoId);
  const { mutateAsync } = useCreateReviewMutation(videoId);
  const { mutateAsync: updateReview } = useUpdateReviewMutation(videoId);
  const { mutateAsync: deleteReview } = useDeleteReviewMutation(videoId);
  const { mutateAsync: enhanceText } = useEnhanceReviewTextMutation();
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  function toggleThread(rootId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }

  async function handleEnhance(text: string): Promise<string | null> {
    try {
      const enhanced = await enhanceText({ text });
      showToast(t('toast.successTitle'), t('videos.textEnhanced'), 'success');
      return enhanced;
    } catch {
      showToast(t('toast.errorTitle'), t('videos.textEnhanceFailed'), 'error');
      return null;
    }
  }

  async function handleEdit(review: Review, content: string) {
    setMutationError(null);
    try {
      await updateReview({ reviewId: review.id, content });
    } catch (e) {
      setMutationError(t('videos.reviewUpdateFailed'));
      throw e;
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setMutationError(null);
    setDeleting(true);
    try {
      await deleteReview({ reviewId: pendingDelete.id });
      setPendingDelete(null);
    } catch {
      setMutationError(t('videos.commentDeleteFailed'));
    } finally {
      setDeleting(false);
    }
  }

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
        <ZSymbol name="message" label={t('videos.comments')} size={18} color={colors.primary} />
        <Text className="text-sm font-semibold text-z-text">{t('videos.comments')}</Text>
        <ZBadge label={String(topLevel.length)} />
      </View>

      {isPending && <ReviewsSkeleton />}

      {isError && (
        <View className="items-start gap-2">
          <Text className="text-sm text-z-muted">{t('videos.phase4.commentsFailed')}</Text>
          <ZButton label={t('common.actions.retry')} variant="tonal" onPress={() => void refetch()} />
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
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? (r) => setPendingDelete(r) : undefined}
              onEnhance={canEdit ? handleEnhance : undefined}
              deleting={deleting && pendingDelete?.id === review.id}
            />
            {(repliesByParent.get(review.id) ?? []).length > 0 &&
              (() => {
                const replyCount = (repliesByParent.get(review.id) ?? []).length;
                const isCollapsed = collapsed.has(review.id);
                return (
                  <ZButton
                    label={`${replyCount} ${t('videos.reply', { count: replyCount })}`}
                    variant="ghost"
                    testID={`thread-collapse-${review.id}`}
                    icon={
                      isCollapsed ? (
                        <ZSymbol name="chevron-right" label={t('videos.reply', { count: replyCount })} size={14} color={colors.muted} />
                      ) : (
                        <ZSymbol name="chevron-down" label={t('videos.reply', { count: replyCount })} size={14} color={colors.muted} />
                      )
                    }
                    onPress={() => toggleThread(review.id)}
                  />
                );
              })()}
            {!collapsed.has(review.id) &&
              (repliesByParent.get(review.id) ?? []).map((reply) => (
                <View key={reply.id} className="ps-3">
                  <ReviewItem
                    review={reply}
                    onSeek={seekTo}
                    isReply
                    onEdit={canEdit ? handleEdit : undefined}
                    onDelete={canDelete ? (r) => setPendingDelete(r) : undefined}
                    onEnhance={canEdit ? handleEnhance : undefined}
                    deleting={deleting && pendingDelete?.id === reply.id}
                  />
                </View>
              ))}
          </View>
        ))}

      {mutationError ? (
        <Text testID="mutation-error-banner" className="text-sm text-z-danger">{mutationError}</Text>
      ) : null}

      {canCompose && (
        <ReviewComposer
          onSubmit={handleSubmit}
          getCurrentTime={replyingTo ? undefined : getCurrentTime}
          replyingTo={replyingTo ?? undefined}
          onCancelReply={() => setReplyingTo(null)}
          onEnhance={canEdit ? handleEnhance : undefined}
        />
      )}

      <ZConfirmDialog
        visible={pendingDelete !== null}
        title={t('videos.confirmDeleteCommentTitle')}
        description={t('videos.confirmDeleteComment')}
        tone="danger"
        confirmLabel={t('common.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
        confirmDisabled={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
        testID="review-delete-confirm"
      />
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
  const isFinalized = data?.status === 'completed';
  const canCompose = (permissions?.includes('reviews:create') ?? false) && !isFinalized;
  const canEdit = (permissions?.includes('reviews:edit') ?? false) && !isFinalized;
  const canDelete = (permissions?.includes('reviews:delete') ?? false) && !isFinalized;
  const canFinalize = (permissions?.includes('assets:finalize') ?? false) && !isFinalized;

  // Finalize
  const { mutateAsync: finalizeAsset } = useFinalizeAssetMutation(id ?? '');
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [unreviewedOpen, setUnreviewedOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Description clamp/show-more state for the meta card.
  const [descExpanded, setDescExpanded] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);

  async function confirmFinalize() {
    if (finalizing) return;
    setFinalizing(true);
    try {
      await finalizeAsset();
      setFinalizeOpen(false);
      showToast(t('toast.successTitle'), t('videos.markedReviewed'), 'success');
    } catch {
      showToast(t('toast.errorTitle'), t('videos.markReviewedFailed'), 'error');
    } finally {
      setFinalizing(false);
    }
  }

  function onPressFinalize() {
    const hasUnreviewed = (data?.videos ?? []).some((v) => v.review_count === 0);
    if (hasUnreviewed) {
      setUnreviewedOpen(true);
    } else {
      setFinalizeOpen(true);
    }
  }

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
      <ZScreen edges={['bottom']} className="gap-4 p-4">
        <Stack.Screen options={{ title: t('videos.title') }} />
        <ZSkeleton testID="asset-detail-skeleton" className="aspect-video w-full" />
        <ZSkeleton className="h-5 w-3/5" />
        <ZSkeleton className="h-4 w-4/5" />
      </ZScreen>
    );
  }

  if (isError || !data) {
    return (
      <ZScreen edges={['bottom']} className="items-center justify-center gap-4 px-8">
        <Stack.Screen options={{ title: t('videos.title') }} />
        <Text className="text-center text-z-muted">{t('videos.phase4.detailFailed')}</Text>
        <ZButton label={t('common.actions.retry')} variant="tonal" onPress={() => void refetch()} />
        <ZButton label={t('common.actions.back')} variant="ghost" onPress={() => router.back()} />
      </ZScreen>
    );
  }

  const videos = data.videos ?? [];
  const processingParts = videos.length - playable.length;
  const group = data.group;
  const statusLabel =
    data.status === 'completed' ? t('common.status.reviewed') : t('common.status.inReview');
  const statusTone = data.status === 'completed' ? 'success' : 'primary';

  return (
    // The video player stays edge-to-edge at the top; the content below it
    // never reaches the status bar, so only the bottom inset is needed.
    <ZScreen edges={['bottom']}>
      {/* Dynamic title: set once asset data is available. Shows the asset title
          in the native header (short, truncated by the OS). */}
      <Stack.Screen options={{ title: data.title }} />
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
              <ZSymbol name="clock" label={t('videos.processingUnavailable')} size={28} color={colors.bg} />
              <Text className="text-z-bg">{t('videos.processingUnavailable')}</Text>
            </View>
          )}
        </View>

        <View className="gap-4 p-4">
          {/* Metadata card: identity row (group + status) and description.
              The asset title is carried by the native header (Stack.Screen). */}
          <ZCard className="gap-2.5">
            {group ? (
              <Touchable
                onPress={() => router.push(`/group/${group.id}`)}
                accessibilityLabel={group.name}
                className="flex-row items-center gap-2"
              >
                <ZAvatar image={group.avatar} fallback={initialsFromName(group.name)} size={24} shape="circle" alt={group.name} />
                <Text className="flex-1 text-sm font-semibold text-z-text" numberOfLines={1}>
                  {group.name}
                </Text>
                <ZBadge label={statusLabel} tone={statusTone} />
              </Touchable>
            ) : (
              <View className="flex-row items-center justify-end">
                <ZBadge label={statusLabel} tone={statusTone} />
              </View>
            )}
            {data.description ? (
              <View className="gap-1">
                <Text
                  testID="asset-description"
                  className="text-sm text-z-muted"
                  numberOfLines={descExpanded ? undefined : 2}
                  onTextLayout={(e) => {
                    if (!descOverflows && e.nativeEvent.lines.length > 2) {
                      setDescOverflows(true);
                    }
                  }}
                >
                  {data.description}
                </Text>
                {descOverflows ? (
                  <Touchable
                    testID="asset-description-toggle"
                    accessibilityLabel={descExpanded ? t('videos.showLess') : t('videos.showMore')}
                    onPress={() => setDescExpanded((v) => !v)}
                    className="self-start"
                  >
                    <Text className="text-[13px] font-bold text-z-primary">
                      {descExpanded ? t('videos.showLess') : t('videos.showMore')}
                    </Text>
                  </Touchable>
                ) : null}
              </View>
            ) : null}
            {canFinalize ? (
              <ZButton
                label={t('videos.markReviewed')}
                testID="asset-finalize"
                icon={<ZSymbol name="check" label={t('videos.markReviewed')} size={16} color={colors.onPrimary} />}
                onPress={onPressFinalize}
              />
            ) : null}
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
                <Text testID="processing-parts-banner" className="text-sm text-z-muted">
                  {t('videos.partsProcessing', { count: processingParts })}
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
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ) : null}

          <ZConfirmDialog
            visible={finalizeOpen}
            title={t('videos.markVideoReviewed')}
            description={t('videos.confirmMarkReviewed')}
            tone="warning"
            confirmLabel={t('videos.markReviewed')}
            cancelLabel={t('common.actions.cancel')}
            confirmDisabled={finalizing}
            onConfirm={() => void confirmFinalize()}
            onCancel={() => setFinalizeOpen(false)}
            testID="asset-finalize-confirm"
          />
          <ZConfirmDialog
            visible={unreviewedOpen}
            title={t('videos.cannotMarkReviewedTitle')}
            description={t('videos.cannotMarkReviewed')}
            tone="info"
            confirmOnly
            confirmLabel={t('common.actions.done')}
            onConfirm={() => setUnreviewedOpen(false)}
            onCancel={() => setUnreviewedOpen(false)}
            testID="asset-finalize-unreviewed"
          />
        </View>
      </ScrollView>
    </ZScreen>
  );
}
