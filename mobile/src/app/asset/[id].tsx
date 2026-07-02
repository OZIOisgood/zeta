import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
import { ZEmptyState } from '../../components/ui/z-empty-state';
import { ZConfirmDialog } from '../../components/ui/z-confirm-dialog';
import { ZKeyboardAvoidingView } from '../../components/ui/z-keyboard-avoiding-view';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { showToast } from '../../components/ui/z-toast';
import { ZSymbol } from '../../components/ui/z-symbol';
import { ZVideoPartRail } from '../../components/ui/z-video-part-rail';
import { Touchable } from '../../components/ui/touchable';
import { useRoleColors } from '../../theme/native';

type AssetVideo = components['schemas']['AssetVideo'];
type AssetGroup = NonNullable<components['schemas']['Asset']['group']>;

function streamUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Asset (video) detail — rebuilt to the UI-kit handoff
 * (mobile/handoffs/handoff_ui_kit/design-references/screens.jsx `AssetDetail`).
 *
 * Layout, top to bottom:
 *   • native header (Stack.Screen title) — carries the asset title
 *   • player (edge-to-edge 16:9, native expo-video controls)
 *   • ZVideoPartRail — clip switcher flush under the player (episode picker)
 *   • content (p-4, gap-4):
 *       – meta card: identity row (avatar · group · status badge) + clamped desc
 *       – comments card: heading + review thread + composer
 *
 * Type scale is the handoff's, lifted ~1px because the app renders the brand
 * font Nunito Sans (more compact than the Inter web mock): heading 19/800,
 * names 16/700, body 15, muted labels 12/500. Avatars use the handoff's peach
 * `accent` tone. Real functionality (queries, seeking, comment CRUD, finalize,
 * permissions, four states) is unchanged from the prior implementation.
 * ────────────────────────────────────────────────────────────────────────── */

// ── Description clamp / show-more state ────────────────────────────────────────
// Both flags live in one reducer so the reset effect dispatches a single action
// (satisfies react-hooks/set-state-in-effect, which flags multiple synchronous
// setState setters in one effect — same pattern as group preferences).
type DescState = { expanded: boolean; overflows: boolean };
type DescAction = { type: 'reset' } | { type: 'toggle' } | { type: 'setOverflows'; value: boolean };

function descReducer(state: DescState, action: DescAction): DescState {
  switch (action.type) {
    case 'reset':
      return { expanded: false, overflows: false };
    case 'toggle':
      return { ...state, expanded: !state.expanded };
    case 'setOverflows':
      return state.overflows === action.value ? state : { ...state, overflows: action.value };
  }
}

// ── Player ─────────────────────────────────────────────────────────────────────

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
    <VideoView player={player} style={{ width: '100%', height: '100%' }} fullscreenOptions={{ enable: true }} />
  );
}

// ── Meta card: identity row + clamped description ──────────────────────────────

function MetaCard({
  group,
  description,
  statusLabel,
  statusTone,
  canFinalize,
  onPressGroup,
  onPressFinalize,
}: {
  group: AssetGroup | undefined;
  description: string;
  statusLabel: string;
  statusTone: 'success' | 'primary';
  canFinalize: boolean;
  onPressGroup: (groupId: string) => void;
  onPressFinalize: () => void;
}) {
  const { t } = useTranslation();
  const { color } = useRoleColors();
  const [desc, dispatchDesc] = useReducer(descReducer, { expanded: false, overflows: false });

  // Reset the clamp state when the description changes, so a stale
  // expanded/overflows can't leak across a route reuse / refetch.
  useEffect(() => {
    dispatchDesc({ type: 'reset' });
  }, [description]);

  return (
    <ZCard className="gap-2.5">
      {/* Identity row — group avatar + name, status badge pushed to the corner.
          The asset title itself is carried by the native header. */}
      {group ? (
        <Touchable
          onPress={() => onPressGroup(group.id)}
          accessibilityLabel={group.name}
          className="flex-row items-center gap-2"
        >
          <ZAvatar
            image={group.avatar}
            fallback={initialsFromName(group.name)}
            size={24}
            shape="circle"
            tone="accent"
            alt={group.name}
          />
          <Text className="flex-1 text-base font-bold text-z-text" numberOfLines={1}>
            {group.name}
          </Text>
          {/* Wrap so the row's items-center wins over ZBadge's baked-in self-start. */}
          <View>
            <ZBadge label={statusLabel} tone={statusTone} />
          </View>
        </Touchable>
      ) : (
        <View className="flex-row items-center justify-end">
          <ZBadge label={statusLabel} tone={statusTone} />
        </View>
      )}

      {/* Description — clamped to 2 lines with a show-more toggle. Mobile renders
          nothing when empty (native density); the web shows a placeholder. */}
      {description ? (
        <View className="gap-1">
          <Text
            testID="asset-description"
            className="text-[15px] leading-[22px] text-z-muted"
            numberOfLines={desc.expanded ? undefined : 2}
          >
            {description}
          </Text>
          {/* Hidden, unclamped "ghost" measurer. We can't measure overflow on the
              visible (clamped) Text: onTextLayout.lines is platform-divergent under
              numberOfLines — iOS reports the full count, Android caps it at the
              clamp (≤2), so the toggle would never appear on Android. This twin
              spans the same width with NO clamp, giving the true line count on both
              platforms. Keep its size/line-height identical to the visible Text. */}
          <Text
            testID="desc-measure"
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ position: 'absolute', left: 0, right: 0, opacity: 0 }}
            className="text-[15px] leading-[22px]"
            onTextLayout={(e) => dispatchDesc({ type: 'setOverflows', value: e.nativeEvent.lines.length > 2 })}
          >
            {description}
          </Text>
          {desc.overflows ? (
            <Touchable
              testID="asset-description-toggle"
              accessibilityLabel={desc.expanded ? t('videos.showLess') : t('videos.showMore')}
              onPress={() => dispatchDesc({ type: 'toggle' })}
              className="self-start"
            >
              <Text className="text-[13px] font-bold text-z-primary">
                {desc.expanded ? t('videos.showLess') : t('videos.showMore')}
              </Text>
            </Touchable>
          ) : null}
        </View>
      ) : null}

      {canFinalize ? (
        <ZButton
          label={t('videos.markReviewed')}
          testID="asset-finalize"
          icon={<ZSymbol name="check" label={t('videos.markReviewed')} size={16} color={color('onAccent')} />}
          onPress={onPressFinalize}
        />
      ) : null}
    </ZCard>
  );
}

// ── Comments card: heading + review thread + composer ──────────────────────────

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
  const { color } = useRoleColors();
  const [replyingTo, setReplyingTo] = useState<Review | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useReviewsQuery(videoId);
  const { mutateAsync } = useCreateReviewMutation(videoId);
  const { mutateAsync: updateReview } = useUpdateReviewMutation(videoId);
  const { mutateAsync: deleteReview } = useDeleteReviewMutation(videoId);
  const { mutateAsync: enhanceText } = useEnhanceReviewTextMutation();
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  // Top-level reviews, oldest first.
  const topLevel = useMemo(
    () =>
      (data ?? [])
        .filter((r) => !r.parent_id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [data],
  );

  // Replies grouped by parent id, each group oldest first.
  const repliesByParent = useMemo(() => {
    const map = new Map<string, Review[]>();
    for (const r of data ?? []) {
      if (r.parent_id) {
        const arr = map.get(r.parent_id) ?? [];
        arr.push(r);
        map.set(r.parent_id, arr);
      }
    }
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
      {/* Heading — icon · "Kommentare" · count, with breathing room beneath.
          Count = ALL comments incl. replies: the asset-card comment badge counts
          the full thread, so "2" on the card must not become "1" here. */}
      <View className="mb-3 flex-row items-center gap-2">
        <ZSymbol name="message" label={t('videos.comments')} size={20} color={color('accent')} />
        <Text className="text-[19px] font-extrabold text-z-text">{t('videos.comments')}</Text>
        <ZBadge label={String((data ?? []).length)} />
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
          <View key={review.id} className="gap-2.5">
            <ReviewItem
              review={review}
              onSeek={seekTo}
              onReply={(r) => setReplyingTo(r)}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? (r) => setPendingDelete(r) : undefined}
              onEnhance={canEdit ? handleEnhance : undefined}
              deleting={deleting && pendingDelete?.id === review.id}
            />
            {/* Replies render inline, indented (handoff has no collapse control). */}
            {(repliesByParent.get(review.id) ?? []).map((reply) => (
              <View key={reply.id} className="ps-[22px]">
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
        <Text testID="mutation-error-banner" className="text-sm text-z-danger">
          {mutationError}
        </Text>
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

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function AssetDetailScreen() {
  const { t } = useTranslation();
  const { color } = useRoleColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isPending, isError, refetch } = useAssetQuery(id ?? '');

  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const isFinalized = data?.status === 'completed';
  const canCompose = (permissions?.includes('reviews:create') ?? false) && !isFinalized;
  const canEdit = (permissions?.includes('reviews:edit') ?? false) && !isFinalized;
  const canDelete = (permissions?.includes('reviews:delete') ?? false) && !isFinalized;
  const canFinalize = (permissions?.includes('assets:finalize') ?? false) && !isFinalized;

  // Finalize flow.
  const { mutateAsync: finalizeAsset } = useFinalizeAssetMutation(id ?? '');
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [unreviewedOpen, setUnreviewedOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

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
    if (hasUnreviewed) setUnreviewedOpen(true);
    else setFinalizeOpen(true);
  }

  // Player ref for seeking from comment timecodes.
  const playerRef = useRef<ReturnType<typeof useVideoPlayer> | null>(null);
  const handlePlayer = useCallback((p: ReturnType<typeof useVideoPlayer>) => {
    playerRef.current = p;
  }, []);

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

  // The active clip drives the player source AND the per-part comment thread
  // (both keyed on active.id, so switching remounts both).
  const playable = useMemo(() => (data?.videos ?? []).filter((v) => v.playback_id !== ''), [data]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = playable.find((v) => v.id === activeId) ?? playable[0] ?? null;

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
  const statusLabel =
    data.status === 'completed' ? t('common.status.reviewed') : t('common.status.inReview');
  const statusTone: 'success' | 'primary' = data.status === 'completed' ? 'success' : 'primary';

  return (
    // The player stays edge-to-edge at the top; content below it never reaches
    // the status bar, so only the bottom inset is applied.
    <ZScreen edges={['bottom']}>
      <Stack.Screen options={{ title: data.title }} />
      {/* KAV + persistTaps: the review composer lives at the bottom of this
          scroll — without them the keyboard covers the field on iOS and the
          first tap on "Send" only dismisses the keyboard (Custom-RN form on a
          plain detail route; the formSheet keyboard rule does not apply here). */}
      <ZKeyboardAvoidingView>
        <ScrollView
          className="flex-1 bg-z-bg"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
        {/* Player (edge-to-edge 16:9). */}
        <View className="aspect-video w-full items-center justify-center bg-black">
          {active ? (
            <Player key={active.id} video={active} onPlayer={handlePlayer} />
          ) : (
            <View className="items-center gap-2">
              <ZSymbol name="clock" label={t('videos.processingUnavailable')} size={28} color={color('background')} />
              <Text className="text-z-bg">{t('videos.processingUnavailable')}</Text>
            </View>
          )}
        </View>

        {/* Clip switcher flush under the player: nothing for one clip, a pill row
            for 2–5, a "Part X of N" trigger + sheet for many. */}
        <ZVideoPartRail
          parts={videos.map((v) => ({ id: v.id, ready: v.playback_id !== '' }))}
          activeId={active?.id ?? null}
          onChange={setActiveId}
        />

        <View className="gap-4 p-4">
          <MetaCard
            group={data.group}
            description={data.description}
            statusLabel={statusLabel}
            statusTone={statusTone}
            canFinalize={canFinalize}
            onPressGroup={(groupId) => router.push(`/group/${groupId}`)}
            onPressFinalize={onPressFinalize}
          />

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
      </ZKeyboardAvoidingView>
    </ZScreen>
  );
}
