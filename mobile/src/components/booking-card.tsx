import { Text, View } from 'react-native';
import { Ban, Phone, Video } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../api/queries/coaching';
import { formatBookingDateTime } from '../api/queries/coaching';
import { ZBadge, type ZBadgeTone } from './ui/z-badge';
import { ZButton } from './ui/z-button';
import { ZCard } from './ui/z-card';
import { ZIconButton } from './ui/z-icon-button';
import { colors } from '../theme/colors';

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

  // Counterpart name — student sees expert; expert sees student
  const counterpart =
    booking.student_id === currentUserId
      ? (booking.expert_name ?? booking.expert_id)
      : (booking.student_name ?? booking.student_id);

  // Counterpart role label, prefixed to the name like web (otherPartyRole):
  // when the current user is the student, the counterpart is the expert.
  const counterpartRole =
    booking.student_id === currentUserId ? 'expert' : 'student';
  const counterpartLabel = t(
    counterpartRole === 'expert' ? 'common.labels.expert' : 'common.labels.student',
  );

  const dateText = formatBookingDateTime(booking.scheduled_at);

  const recordingBadge = booking.recording
    ? resolveRecordingBadge(booking.recording.status)
    : null;

  // Open-recording button gated on a ready recording with a processed asset.
  const recordingReady = booking.recording?.status === 'ready' && !!booking.recording?.asset_id;

  return (
    <ZCard className="mb-3">
      {/* Row 1: session type name + status + recording badges */}
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="flex-shrink text-base font-semibold text-z-text" numberOfLines={1}>
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
      <Text className="mt-1 text-sm text-z-muted">
        {counterpartLabel}: {counterpart}
      </Text>

      {/* Row 3: date/time + duration */}
      <Text className="mt-1 text-sm text-z-muted">
        {dateText} · {booking.duration_minutes} min
      </Text>

      {/* Optional notes */}
      {booking.notes ? (
        <Text className="mt-1 text-sm text-z-muted" numberOfLines={1}>
          {booking.notes}
        </Text>
      ) : null}

      {/* Cancellation reason — danger-toned, mirrors web rose-700 line */}
      {booking.status === 'cancelled' && booking.cancellation_reason ? (
        <Text testID="booking-cancellation-reason" className="mt-2 text-sm text-z-danger">
          {t('common.labels.reason', { reason: booking.cancellation_reason })}
        </Text>
      ) : null}

      {/* Footer row: join + recording + cancel */}
      {(onJoin || recordingReady || canCancel) ? (
        <View className="mt-3 flex-row items-center gap-2">
          {onJoin ? (
            <ZButton
              testID="booking-join"
              label={t('common.actions.join')}
              variant="primary"
              icon={<Phone color={colors.onPrimary} size={16} />}
              onPress={onJoin}
            />
          ) : null}
          {recordingReady ? (
            <ZButton
              testID="booking-recording"
              label={t('common.status.recordingReady')}
              variant="ghost"
              icon={<Video color={colors.text} size={16} />}
              onPress={() => onOpenRecording(booking.recording!.asset_id!)}
            />
          ) : null}
          {canCancel ? (
            <ZIconButton
              testID="booking-cancel"
              label={t('sessions.cancel.title')}
              variant="ghost"
              onPress={onCancel}
            >
              <Ban color={colors.danger} size={18} />
            </ZIconButton>
          ) : null}
        </View>
      ) : null}
    </ZCard>
  );
}
