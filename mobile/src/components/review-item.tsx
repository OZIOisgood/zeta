import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Review } from '../api/queries/reviews';
import { initialsFromName } from '../lib/avatar';
import { formatRelativeTime } from '../lib/datetime';
import { colors } from '../theme/colors';
import { Touchable } from './ui/touchable';
import { ZAvatar } from './ui/z-avatar';
import { ZButton } from './ui/z-button';
import { ZIconButton } from './ui/z-icon-button';
import { ZSeekChip } from './ui/z-seek-chip';
import { ZSymbol } from './ui/z-symbol';
import { ZTextarea } from './ui/z-textarea';

/**
 * Formats a duration in seconds to "m:ss" — e.g. 75 → "1:15".
 * Exported for reuse (ReviewComposer "at m:ss" label, tests).
 */
export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export type ReviewItemProps = {
  review: Review;
  onSeek?: (seconds: number) => void;
  onReply?: (review: Review) => void;
  isReply?: boolean;
  /** Shown only when set; gates the Pencil action. */
  onEdit?: (review: Review, content: string) => Promise<void> | void;
  /** Shown only when set; gates the Trash action. */
  onDelete?: (review: Review) => void;
  /** Async text enhancer used by the inline edit form's Sparkles action. */
  onEnhance?: (text: string) => Promise<string | null>;
  /** True while a delete confirmation for THIS review is pending (disables the row's actions). */
  deleting?: boolean;
};

export function ReviewItem({
  review,
  onSeek,
  onReply,
  isReply = false,
  onEdit,
  onDelete,
  onEnhance,
  deleting = false,
}: ReviewItemProps) {
  const { t } = useTranslation();
  const authorName = review.author?.name ?? t('videos.unknownAuthor');
  const showReplyButton = Boolean(onReply) && !isReply;
  const hasTimestamp =
    review.timestamp_seconds !== undefined && review.timestamp_seconds !== null;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(review.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  function startEdit() {
    setDraft(review.content);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setDraft(review.content);
  }

  async function saveEdit() {
    const trimmed = draft.trim();
    if (!trimmed || savingEdit || !onEdit) return;
    setSavingEdit(true);
    try {
      await onEdit(review, trimmed);
      setIsEditing(false);
    } catch {
      // onEdit (the parent's handleEdit) sets the error banner and re-throws so
      // setIsEditing(false) is skipped — the form stays open with the user's draft.
      // We catch here to avoid an unhandled-promise-rejection; user feedback is
      // handled by the parent via the mutationError banner.
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleEnhance() {
    const trimmed = draft.trim();
    if (!trimmed || enhancing || !onEnhance) return;
    setEnhancing(true);
    try {
      const enhanced = await onEnhance(trimmed);
      if (enhanced) setDraft(enhanced);
    } finally {
      setEnhancing(false);
    }
  }

  return (
    <View className="flex-row items-start gap-2.5">
      <ZAvatar
        image={review.author?.avatar}
        fallback={initialsFromName(authorName)}
        alt={authorName}
        size={isReply ? 28 : 36}
        shape="circle"
      />

      <View className="min-w-0 flex-1">
        {/* Author name + video-timecode seek pill on one line ("Coach Petra  ▶ 0:12"). */}
        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
          <Text
            testID="review-author"
            className="flex-shrink text-base font-bold text-z-text"
            numberOfLines={1}
          >
            {authorName}
          </Text>
          {hasTimestamp && (
            <ZSeekChip
              label={formatTimestamp(review.timestamp_seconds!)}
              onPress={onSeek ? () => onSeek(review.timestamp_seconds!) : undefined}
              accessibilityLabel={t('videos.seekTo', {
                time: formatTimestamp(review.timestamp_seconds!),
              })}
              testID="review-seek"
            />
          )}
        </View>

        {isEditing ? (
          <View className="mt-2 gap-2" testID="review-edit-form">
            <ZTextarea
              testID="review-edit-input"
              accessibilityLabel={t('videos.commentPlaceholder')}
              placeholder={t('videos.commentPlaceholder')}
              value={draft}
              onChangeText={setDraft}
              rows={3}
              disabled={savingEdit}
            />
            <View className="flex-row items-center justify-between gap-2">
              {onEnhance ? (
                <ZButton
                  label={enhancing ? t('videos.enhancing') : t('videos.enhanceText')}
                  variant="tonal"
                  testID="review-edit-enhance"
                  loading={enhancing}
                  disabled={!draft.trim() || savingEdit}
                  icon={<ZSymbol name="sparkles" label="" size={16} color={colors.text} />}
                  onPress={() => void handleEnhance()}
                />
              ) : (
                <View />
              )}
              <View className="flex-row gap-2">
                <ZButton
                  label={t('common.actions.cancel')}
                  variant="secondary"
                  testID="review-edit-cancel"
                  disabled={savingEdit || enhancing}
                  onPress={cancelEdit}
                />
                <ZButton
                  label={t('common.actions.save')}
                  testID="review-edit-save"
                  loading={savingEdit}
                  disabled={!draft.trim() || enhancing}
                  onPress={() => void saveEdit()}
                />
              </View>
            </View>
          </View>
        ) : (
          <Text className="mt-0.5 text-[15px] leading-[23px] text-z-text">{review.content}</Text>
        )}

        {!isEditing && (
          <View className="mt-2 flex-row flex-wrap items-center gap-3">
            <Text className="text-xs font-medium text-z-muted">
              {formatRelativeTime(review.created_at, t)}
            </Text>

            {showReplyButton && (
              <Touchable
                testID="review-reply"
                accessibilityLabel={t('videos.reply')}
                onPress={() => onReply!(review)}
                className="flex-row items-center gap-1"
              >
                <ZSymbol name="reply" label="" size={14} color={colors.muted} />
                <Text className="text-xs font-bold text-z-muted">{t('videos.reply')}</Text>
              </Touchable>
            )}

            {onEdit && (
              <ZIconButton
                label={t('videos.editComment')}
                size="sm"
                testID="review-edit"
                disabled={deleting}
                onPress={startEdit}
              >
                <ZSymbol name="edit" label="" size={14} color={colors.muted} />
              </ZIconButton>
            )}

            {onDelete && (
              <ZIconButton
                label={t('videos.deleteComment')}
                size="sm"
                testID="review-delete"
                disabled={deleting}
                onPress={() => onDelete(review)}
              >
                <ZSymbol name="trash" label="" size={14} color={colors.danger} />
              </ZIconButton>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
