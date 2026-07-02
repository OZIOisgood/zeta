import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../api/queries/coaching';
import { formatBookingDateTime } from '../api/queries/coaching';
import { ZBadge, type ZBadgeTone } from './ui/z-badge';
import { ZButton } from './ui/z-button';
import { ZCard } from './ui/z-card';
import { ZSwipeable } from './ui/z-swipeable';
import { ZSymbol } from './ui/z-symbol';
import { useRoleColors } from '../theme/native';

/**
 * Resolve the status display label for a booking from the server-provided
 * status — never from the scheduled date. The server already derives the
 * `done` status (scheduled_at in the past), so keying the label off the date
 * could disagree with the badge tone at the time boundary or under clock skew
 * (e.g. a server `pending` whose start just passed). Mapping pending → upcoming,
 * done → done, cancelled → cancelled keeps label and tone in lockstep with the
 * source of truth.
 */
export function resolveStatusLabel(
  status: Booking['status'],
  labels: { cancelled: string; upcoming: string; done: string },
): string {
  switch (status) {
    case 'cancelled':
      return labels.cancelled;
    case 'done':
      return labels.done;
    default:
      return labels.upcoming;
  }
}

/**
 * Map the server-provided booking status to a badge tone. Driven by the
 * server status (not the date) so the badge can never disagree with the
 * source of truth: cancelled → danger, pending → primary, done → neutral.
 */
const statusTones: Record<Booking['status'], ZBadgeTone> = {
  cancelled: 'danger',
  pending: 'primary',
  done: 'neutral',
};

/**
 * Map the recording pipeline status to a badge tone + label key.
 * Mirrors web recordingStatusLabel() in sessions-page.component.ts.
 */
function resolveRecordingBadge(status: string | undefined): {
  tone: ZBadgeTone;
  labelKey: string;
} {
  switch (status) {
    case 'ready':
      return { tone: 'success', labelKey: 'common.status.recordingReady' };
    case 'failed':
      return { tone: 'danger', labelKey: 'common.status.recordingFailed' };
    case 'starting':
    case 'started':
    case 'stopping':
    case 'stopped':
      return { tone: 'primary', labelKey: 'common.status.recordingCaptured' };
    default:
      return { tone: 'primary', labelKey: 'common.status.recordingProcessing' };
  }
}

/**
 * Resolve the counterpart shown on a booking card: the student sees the expert;
 * the expert sees the student. Returns the display name (falling back to the id
 * when the name is absent) and the counterpart's role, which the card uses to
 * pick the role label (otherPartyRole on web).
 */
export function bookingCounterpart(
  booking: Booking,
  currentUserId: string,
): { name: string; role: 'expert' | 'student' } {
  const isStudent = booking.student_id === currentUserId;
  return {
    name: isStudent ? (booking.expert_name ?? booking.expert_id) : (booking.student_name ?? booking.student_id),
    role: isStudent ? 'expert' : 'student',
  };
}

export type BookingCardProps = {
  booking: Booking;
  currentUserId: string;
  canCancel: boolean;
  onCancel: () => void;
  onOpenRecording: (assetId: string) => void;
  /** When provided, renders a Join button in the footer (shown during the join window). */
  onJoin?: () => void;
};

export function BookingCard({
  booking,
  currentUserId,
  canCancel,
  onCancel,
  onOpenRecording,
  onJoin,
}: BookingCardProps) {
  const { t } = useTranslation();
  const { color } = useRoleColors();

  // Swipe-to-cancel is invisible to VoiceOver/TalkBack: RNGH renders the
  // trailing action only during the gesture, so it never exists in the a11y
  // tree. When a screen reader is active, surface cancel as an explicit
  // footer button instead of the (unperformable) swipe.
  const [screenReaderOn, setScreenReaderOn] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReaderOn(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReaderOn);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  const showCancelButton = canCancel && screenReaderOn;

  const sessionTypeName = booking.session_type_name ?? t('sessions.sessionFallback');

  // Status label — driven by the server status (not the date) so it can never
  // disagree with the badge tone (statusTones[booking.status]). Web's
  // statusLabel() keys off the date, but web shares the `primary` tone across
  // pending/done so the mismatch stays invisible there; mobile splits the tones.
  const statusLabel = resolveStatusLabel(booking.status, {
    cancelled: t('common.status.cancelled'),
    upcoming: t('common.status.upcoming'),
    done: t('common.status.done'),
  });

  // Counterpart name + role — student sees expert; expert sees student.
  // Role label is prefixed to the name like web (otherPartyRole).
  const { name: counterpart, role: counterpartRole } = bookingCounterpart(booking, currentUserId);
  const counterpartLabel = t(
    counterpartRole === 'expert' ? 'common.labels.expert' : 'common.labels.student',
  );

  const dateText = formatBookingDateTime(booking.scheduled_at);

  const recordingBadge = booking.recording
    ? resolveRecordingBadge(booking.recording.status)
    : null;

  // Open-recording button gated on a ready recording with a processed asset.
  const recordingReady = booking.recording?.status === 'ready' && !!booking.recording?.asset_id;

  const card = (
    <ZCard tone="surface">
      {/* Row 1: session type name + status + recording badges */}
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="flex-shrink text-base font-bold text-z-text" numberOfLines={1}>
          {sessionTypeName}
        </Text>
        <ZBadge
          testID={`booking-status-${booking.status}`}
          tone={statusTones[booking.status]}
          label={statusLabel}
        />
        {recordingBadge ? (
          <ZBadge
            testID="booking-recording-status"
            tone={recordingBadge.tone}
            label={t(recordingBadge.labelKey)}
          />
        ) : null}
      </View>

      {/* Row 2: counterpart role + name */}
      <Text className="mt-1 text-[15px] text-z-muted">
        {counterpartLabel}: {counterpart}
      </Text>

      {/* Row 3: date/time + duration (leading clock glyph) */}
      <View className="mt-1 flex-row items-center gap-1.5">
        {/* Decorative: the clock renders for done/cancelled bookings too, so a
            status label ('upcoming') would mis-announce. The adjacent date/time
            text conveys the info, so the glyph is not announced (label=""). */}
        <ZSymbol name="clock" label="" size={14} color={color('onSurfaceVariant')} />
        <Text className="text-xs font-medium text-z-muted">
          {dateText} · {t('common.labels.minutesShort', { count: booking.duration_minutes })}
        </Text>
      </View>

      {/* Optional notes */}
      {booking.notes ? (
        <Text className="mt-1 text-[15px] text-z-muted" numberOfLines={1}>
          {booking.notes}
        </Text>
      ) : null}

      {/* Cancellation reason — danger-toned, mirrors web rose-700 line */}
      {booking.status === 'cancelled' && booking.cancellation_reason ? (
        <Text testID="booking-cancellation-reason" className="mt-2 text-[15px] text-z-danger">
          {t('common.labels.reason', { reason: booking.cancellation_reason })}
        </Text>
      ) : null}

      {/* Footer row: join + recording. Cancel is a swipe action on the whole
          card (see the ZSwipeable wrap below) — except under a screen reader,
          where it renders as an explicit button (the swipe is unperformable
          and its action is not in the a11y tree). */}
      {(onJoin || recordingReady || showCancelButton) ? (
        <View className="mt-3 flex-row items-center gap-2">
          {showCancelButton ? (
            <ZButton
              testID="booking-cancel-a11y"
              label={t('sessions.cancel.title')}
              variant="danger-outline"
              onPress={onCancel}
            />
          ) : null}
          {onJoin ? (
            <ZButton
              testID="booking-join"
              label={t('common.actions.join')}
              variant="primary"
              icon={<ZSymbol name="phone" label={t('common.actions.join')} size={16} color={color('onAccent')} />}
              onPress={onJoin}
            />
          ) : null}
          {recordingReady ? (
            <ZButton
              testID="booking-recording"
              label={t('common.status.recordingReady')}
              variant="tonal"
              icon={<ZSymbol name="video" label={t('common.status.recordingReady')} size={16} color={color('onSurface')} />}
              onPress={() => onOpenRecording(booking.recording!.asset_id!)}
            />
          ) : null}
        </View>
      ) : null}
    </ZCard>
  );

  // Upcoming bookings are cancelable via a right-to-left swipe that reveals a
  // danger "Cancel" action (replacing the old footer ban-icon button); the
  // action opens the cancel formSheet (cancel/[bookingId]). Past/cancelled
  // bookings render the card plainly. The mb-3 row spacing lives on the wrapper
  // so the revealed swipe action fills the card height, not the inter-card gap.
  return (
    <View className="mb-3">
      {canCancel ? (
        <ZSwipeable
          testID="booking-cancel-swipe"
          actionLabel={t('sessions.cancel.title')}
          actionIcon={<ZSymbol name="ban" label="" size={20} color={color('onAccent')} />}
          onAction={onCancel}
        >
          {card}
        </ZSwipeable>
      ) : (
        card
      )}
    </View>
  );
}
