import { useState } from 'react';
import { Text, View } from 'react-native';
import { Send, Sparkles, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { CreateReviewInput, Review } from '../api/queries/reviews';
import { colors } from '../theme/colors';
import { ZChip } from './ui/z-chip';
import { ZIconButton } from './ui/z-icon-button';
import { ZTextarea } from './ui/z-textarea';
import { formatTimestamp } from './review-item';

export type ReviewComposerProps = {
  /**
   * Called when the user submits. Receives `content`, optionally
   * `timestampSeconds` (only when the user toggled the "at m:ss" chip),
   * and optionally `parentId` when replying.
   */
  onSubmit?: (input: CreateReviewInput) => Promise<void> | void;
  /**
   * Returns the current player time in seconds. When provided (and not in
   * reply mode) a chip lets the user attach the timestamp.
   */
  getCurrentTime?: () => number;
  /** When set, the composer is in reply mode: no timestamp chip, banner shows. */
  replyingTo?: Pick<Review, 'id' | 'content' | 'author' | 'created_at'>;
  onCancelReply?: () => void;
  /** Async text enhancer; when set, a Sparkles button rewrites the draft. */
  onEnhance?: (text: string) => Promise<string | null>;
};

/**
 * Comment / reply composer bar.
 * Mirrors the web video-details comment-composer and reply form.
 */
export function ReviewComposer({
  onSubmit,
  getCurrentTime,
  replyingTo,
  onCancelReply,
  onEnhance,
}: ReviewComposerProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [capturedTime, setCapturedTime] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  const isReplyMode = Boolean(replyingTo);

  async function handleEnhance() {
    const trimmed = content.trim();
    if (!trimmed || enhancing || !onEnhance) return;
    setEnhancing(true);
    try {
      const enhanced = await onEnhance(trimmed);
      if (enhanced) setContent(enhanced);
    } finally {
      setEnhancing(false);
    }
  }
  const canAttachTimestamp = Boolean(getCurrentTime) && !isReplyMode;

  function handleToggleTimestamp() {
    if (!getCurrentTime) return;
    if (!includeTimestamp) {
      setCapturedTime(getCurrentTime());
      setIncludeTimestamp(true);
    } else {
      setIncludeTimestamp(false);
      setCapturedTime(null);
    }
  }

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || busy) return;
    if (!onSubmit) return;

    const input: CreateReviewInput = { content: trimmed };
    if (includeTimestamp && capturedTime !== null) {
      input.timestampSeconds = capturedTime;
    }
    if (replyingTo) {
      input.parentId = replyingTo.id;
    }

    setBusy(true);
    try {
      await onSubmit(input);
      setContent('');
      setIncludeTimestamp(false);
      setCapturedTime(null);
    } finally {
      setBusy(false);
    }
  }

  const timestampLabel =
    capturedTime !== null
      ? t('videos.atTime', { time: formatTimestamp(capturedTime) })
      : t('videos.atTime', { time: '0:00' });

  return (
    <View className="gap-2.5">
      {/* Reply banner */}
      {replyingTo && (
        <View className="flex-row items-center gap-2 rounded-md bg-z-surface-warm px-3 py-2">
          <Text className="flex-1 text-xs text-z-muted" numberOfLines={1}>
            {t('videos.replyingTo', {
              name: replyingTo.author?.name ?? t('videos.unknownAuthor'),
            })}
          </Text>
          <ZIconButton
            label={t('videos.cancelReply')}
            size="sm"
            testID="review-cancel-reply"
            onPress={onCancelReply}
          >
            <X color={colors.muted} size={14} />
          </ZIconButton>
        </View>
      )}

      {/* Input (full width), then a control row matching the handoff:
          [timestamp chip] · spacer · [enhance] [send]. */}
      <ZTextarea
        testID="review-input"
        accessibilityLabel={t('videos.addCommentPlaceholder')}
        placeholder={t('videos.addCommentPlaceholder')}
        value={content}
        onChangeText={setContent}
        rows={2}
        disabled={busy}
      />
      <View className="flex-row items-center gap-2">
        {canAttachTimestamp ? (
          <ZChip
            label={timestampLabel}
            selected={includeTimestamp}
            onPress={handleToggleTimestamp}
            testID="review-at-time"
          />
        ) : null}
        <View className="flex-1" />
        {onEnhance && !isReplyMode ? (
          <ZIconButton
            label={enhancing ? t('videos.enhancing') : t('videos.enhanceText')}
            size="sm"
            testID="review-enhance"
            disabled={!content.trim() || busy || enhancing}
            onPress={() => void handleEnhance()}
          >
            <Sparkles color={colors.muted} size={16} />
          </ZIconButton>
        ) : null}
        <ZIconButton
          label={t('videos.send')}
          variant="primary"
          size="sm"
          testID="review-send"
          disabled={!content.trim() || busy}
          onPress={() => void handleSend()}
        >
          <Send color={colors.onPrimary} size={16} />
        </ZIconButton>
      </View>
    </View>
  );
}
