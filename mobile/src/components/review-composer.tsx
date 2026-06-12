import { useState } from 'react';
import { Text, View } from 'react-native';
import { Send, X } from 'lucide-react-native';
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
}: ReviewComposerProps) {
  const [content, setContent] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [capturedTime, setCapturedTime] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const isReplyMode = Boolean(replyingTo);
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
    capturedTime !== null ? `at ${formatTimestamp(capturedTime)}` : 'at 0:00';

  return (
    <View className="gap-2">
      {/* Reply banner */}
      {replyingTo && (
        <View className="flex-row items-center gap-2 rounded-md bg-z-surface-warm px-3 py-2">
          <Text className="flex-1 text-xs text-z-muted" numberOfLines={1}>
            Replying to{' '}
            <Text className="font-semibold text-z-text">
              {replyingTo.author?.name ?? 'Unknown'}
            </Text>
          </Text>
          <ZIconButton
            label="Cancel reply"
            size="sm"
            testID="review-cancel-reply"
            onPress={onCancelReply}
          >
            <X color={colors.muted} size={14} />
          </ZIconButton>
        </View>
      )}

      {/* Timestamp toggle chip (only when not in reply mode) */}
      {canAttachTimestamp && (
        <ZChip
          label={timestampLabel}
          selected={includeTimestamp}
          onPress={handleToggleTimestamp}
          testID="review-at-time"
        />
      )}

      {/* Input row */}
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <ZTextarea
            testID="review-input"
            accessibilityLabel="Add a comment"
            placeholder="Add a comment…"
            value={content}
            onChangeText={setContent}
            rows={2}
            disabled={busy}
          />
        </View>
        <ZIconButton
          label="Send"
          variant="primary"
          size="sm"
          testID="review-send"
          disabled={!content.trim() || busy}
          onPress={() => void handleSend()}
        >
          <Send color={colors.bg} size={16} />
        </ZIconButton>
      </View>
    </View>
  );
}
