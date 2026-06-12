import { Text, View } from 'react-native';
import { Ban, Phone, Video } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../api/queries/coaching';
import { ZButton } from './ui/z-button';
import { ZIconButton } from './ui/z-icon-button';
import { colors } from '../theme/colors';

/**
 * Resolve the status display label for a booking.
 * Extracted as a pure utility so the impure Date.now() call
 * is outside the React component render path (mirrors review-item.tsx pattern).
 */
export function resolveStatusLabel(
  status: Booking['status'],
  scheduledAt: string,
  labels: { cancelled: string; upcoming: string; done: string },
): string {
  if (status === 'cancelled') return labels.cancelled;
  return new Date(scheduledAt).getTime() > Date.now() ? labels.upcoming : labels.done;
}

/** Status chip: inline badge that mirrors the web z-badge tone. */
function StatusChip({ status, label }: { status: Booking['status']; label: string }) {
  const chipClass = status === 'pending' ? 'bg-z-primary-soft' : 'bg-z-surface-muted';
  const textClass =
    status === 'pending'
      ? 'text-z-primary-strong'
      : status === 'cancelled'
        ? 'text-z-danger'
        : 'text-z-muted';
  return (
    <View
      testID={`booking-status-${status}`}
      className={`rounded-full px-2 py-0.5 ${chipClass}`}
    >
      <Text className={`text-xs font-medium ${textClass}`}>{label}</Text>
    </View>
  );
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

  // Status label — mirrors web statusLabel() in sessions-page.component.ts
  // web uses: cancelled → common.status.cancelled; upcoming → common.status.upcoming; else → common.status.done
  const statusLabel = resolveStatusLabel(booking.status, booking.scheduled_at, {
    cancelled: t('common.status.cancelled'),
    upcoming: t('common.status.upcoming'),
    done: t('common.status.done'),
  });

  // Counterpart name — student sees expert; expert sees student
  const counterpart =
    booking.student_id === currentUserId
      ? (booking.expert_name ?? booking.expert_id)
      : (booking.student_name ?? booking.student_id);

  const dateText = new Date(booking.scheduled_at).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const hasRecording = !!booking.recording?.asset_id;

  return (
    <View className="mb-3 rounded-lg border border-z-border bg-z-surface p-3">
      {/* Row 1: session type name + status chip */}
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="flex-shrink text-base font-semibold text-z-text" numberOfLines={1}>
          {sessionTypeName}
        </Text>
        <StatusChip status={booking.status} label={statusLabel} />
      </View>

      {/* Row 2: counterpart name */}
      <Text className="mt-1 text-sm text-z-muted">{counterpart}</Text>

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

      {/* Footer row: join + recording + cancel */}
      {(onJoin || hasRecording || canCancel) ? (
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
          {hasRecording ? (
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
    </View>
  );
}
