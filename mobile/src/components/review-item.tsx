import { Text, View } from 'react-native';
import { Reply } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Review } from '../api/queries/reviews';
import { initialsFromName } from '../lib/avatar';
import { colors } from '../theme/colors';
import { ZAvatar } from './ui/z-avatar';
import { ZChip } from './ui/z-chip';
import { ZIconButton } from './ui/z-icon-button';

/**
 * Formats a duration in seconds to "m:ss" — e.g. 75 → "1:15".
 * Exported for reuse (ReviewComposer "at m:ss" label, tests).
 */
export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats a short relative/absolute date without adding new dependencies.
 * Web uses a RelativeTimePipe; here we do a lightweight approximation.
 */
function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  // Fallback: locale date string
  return new Date(isoString).toLocaleDateString();
}

export type ReviewItemProps = {
  review: Review;
  onSeek?: (seconds: number) => void;
  onReply?: (review: Review) => void;
  isReply?: boolean;
};

/**
 * Single review row. Matches the web video-details thread layout:
 * an avatar column + a content column (author line → body → meta row with
 * timestamp chip + date + reply button). Replies use a smaller avatar and
 * slightly muted styling so nesting reads visually.
 */
export function ReviewItem({ review, onSeek, onReply, isReply = false }: ReviewItemProps) {
  const { t } = useTranslation();
  const authorName = review.author?.name ?? t('videos.unknownAuthor');
  // Suppress the reply affordance on replies — one-level threads only.
  const showReplyButton = Boolean(onReply) && !isReply;

  return (
    <View className="flex-row items-start gap-2">
      {/* Avatar column — smaller on replies so nesting reads visually. */}
      <ZAvatar
        image={review.author?.avatar}
        fallback={initialsFromName(authorName)}
        alt={authorName}
        size={isReply ? 28 : 36}
      />

      {/* Content column */}
      <View className="min-w-0 flex-1">
        {/* Author line */}
        <Text
          testID="review-author"
          className="text-sm font-semibold text-z-text"
          numberOfLines={1}
        >
          {authorName}
        </Text>

        {/* Body */}
        <Text className="mt-1 text-sm leading-6 text-z-text">{review.content}</Text>

        {/* Meta row */}
        <View className="mt-1 flex-row flex-wrap items-center gap-2">
          {review.timestamp_seconds !== undefined && review.timestamp_seconds !== null && (
            <ZChip
              label={formatTimestamp(review.timestamp_seconds)}
              onPress={onSeek ? () => onSeek(review.timestamp_seconds!) : undefined}
            />
          )}

          <Text className="text-xs text-z-muted">{formatRelativeTime(review.created_at)}</Text>

          {showReplyButton && (
            <ZIconButton
              label={t('videos.reply')}
              size="sm"
              testID="review-reply"
              onPress={() => onReply!(review)}
            >
              <Reply color={colors.muted} size={14} />
            </ZIconButton>
          )}
        </View>
      </View>
    </View>
  );
}
