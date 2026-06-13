import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarClock, CloudOff, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../../api/queries/coaching';
import { useMyBookingsQuery, useCancelBookingMutation } from '../../api/queries/coaching';
import { useAuth } from '../../auth/auth-store';
import { BookingCard } from '../../components/booking-card';
import { isJoinable } from '../../lib/connect-window';
import { ZButton } from '../../components/ui/z-button';
import { ZDialogPanel } from '../../components/ui/z-dialog-panel';
import { ZEmptyState } from '../../components/ui/z-empty-state';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { ZTabs } from '../../components/ui/z-tabs';
import { ZTextarea } from '../../components/ui/z-textarea';
import { showToast } from '../../components/ui/z-toast';
import { colors } from '../../theme/colors';

type SessionTab = 'upcoming' | 'past' | 'cancelled';

const startsAt = (booking: Booking): number => new Date(booking.scheduled_at).getTime();

function ListSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          testID="booking-skeleton"
          className="rounded-lg border border-z-border bg-z-surface p-3"
        >
          <View className="flex-row gap-2">
            <ZSkeleton className="h-4 w-2/5" />
            <ZSkeleton className="h-4 w-1/5 rounded-full" />
          </View>
          <ZSkeleton className="mt-2 h-3 w-1/3" />
          <ZSkeleton className="mt-1 h-3 w-2/5" />
        </View>
      ))}
    </View>
  );
}

/**
 * CancelDialog owns the useCancelBookingMutation hook for a single booking.
 * React rules forbid calling hooks in loops, so the cancellation flow gets its
 * own component instance — mounted only while a booking is selected — that holds
 * the mutation for that booking's group. Composes ZDialogPanel + ZTextarea so the
 * student can attach an optional reason, which is passed through to the mutation.
 */
function CancelDialog({
  booking,
  onDone,
  onAbort,
}: {
  booking: Booking;
  onDone: () => void;
  onAbort: () => void;
}) {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useCancelBookingMutation(booking.group_id);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    const trimmed = reason.trim();
    try {
      await mutateAsync({ bookingId: booking.id, reason: trimmed === '' ? undefined : trimmed });
      showToast(t('toast.successTitle'), undefined, 'success');
      onDone();
    } catch {
      setError(t('sessions.cancel.failed'));
    }
  }

  return (
    <ZDialogPanel visible onClose={onAbort} testID="booking-cancel-dialog">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-md bg-rose-50">
          <Trash2 color={colors.danger} size={20} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold leading-6 text-z-text">
            {t('sessions.cancel.title')}
          </Text>
        </View>
      </View>

      <View className="mt-4">
        <ZTextarea
          testID="booking-cancel-reason"
          value={reason}
          onChangeText={setReason}
          accessibilityLabel={t('sessions.cancel.title')}
          placeholder={t('sessions.cancel.placeholder')}
          rows={3}
          disabled={isPending}
        />
      </View>

      {error ? <Text className="mt-2 text-sm text-z-danger">{error}</Text> : null}

      <View className="mt-6 flex-row justify-end gap-2">
        <ZButton label={t('sessions.cancel.keep')} variant="secondary" onPress={onAbort} />
        <ZButton
          testID="booking-cancel-confirm"
          label={t('sessions.cancel.title')}
          variant="danger"
          loading={isPending}
          disabled={isPending}
          onPress={() => void handleConfirm()}
        />
      </View>
    </ZDialogPanel>
  );
}

export default function CoachingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isPending, isError, refetch, isRefetching } = useMyBookingsQuery();
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const currentUserId = useAuth((s) => s.user?.id ?? '');
  const canBook = permissions !== null && permissions.includes('coaching:book');
  const canConnect = permissions !== null && permissions.includes('coaching:video:connect');

  const [activeTab, setActiveTab] = useState<SessionTab>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const now = new Date();
  const nowMs = now.getTime();

  // Three distinct lists, mirroring the web SessionsOverviewStore: cancelled is
  // its own bucket (never folded into past); upcoming/past split pending+done by
  // the scheduled time.
  const bookings = data ?? [];
  const upcoming = bookings
    .filter((b) => b.status !== 'cancelled' && startsAt(b) > nowMs)
    .sort((a, b) => startsAt(a) - startsAt(b));
  const past = bookings
    .filter((b) => b.status !== 'cancelled' && startsAt(b) <= nowMs)
    .sort((a, b) => startsAt(b) - startsAt(a));
  const cancelled = bookings
    .filter((b) => b.status === 'cancelled')
    .sort((a, b) => startsAt(b) - startsAt(a));

  const tabs = [
    { id: 'upcoming', label: t('sessions.tabs.upcoming'), count: upcoming.length },
    { id: 'past', label: t('sessions.tabs.past'), count: past.length },
    { id: 'cancelled', label: t('sessions.tabs.cancelled'), count: cancelled.length },
  ];

  const visibleBookings =
    activeTab === 'past' ? past : activeTab === 'cancelled' ? cancelled : upcoming;

  const emptyState = (
    <ZEmptyState
      title={t(`sessions.empty.${activeTab}Heading`)}
      description={t(`sessions.empty.${activeTab}Description`)}
      icon={<CalendarClock color={colors.primary} size={24} />}
    />
  );

  function renderBooking(booking: Booking) {
    const cancellable = activeTab === 'upcoming';
    return (
      <BookingCard
        booking={booking}
        currentUserId={currentUserId}
        canCancel={cancellable && cancellingId !== booking.id}
        onCancel={() => setCancellingId(booking.id)}
        onOpenRecording={(assetId) => router.push(`/asset/${assetId}`)}
        onJoin={
          canConnect && isJoinable(booking, now)
            ? () => router.push(`/call/${booking.id}?groupId=${booking.group_id}`)
            : undefined
        }
      />
    );
  }

  let content: React.ReactNode;

  if (isPending) {
    content = <ListSkeleton />;
  } else if (isError) {
    content = (
      <View testID="coaching-error" className="p-4">
        <ZEmptyState
          title={t('sessions.loadFailed')}
          description={t('sessions.empty.upcomingDescription')}
          icon={<CloudOff color={colors.danger} size={24} />}
        >
          <ZButton
            label={t('upload.retry')}
            variant="secondary"
            onPress={() => void refetch()}
          />
        </ZEmptyState>
      </View>
    );
  } else {
    content = (
      <FlatList
        testID={`coaching-list-${activeTab}`}
        className="flex-1 bg-z-bg"
        data={visibleBookings}
        keyExtractor={(booking) => booking.id}
        renderItem={({ item }) => renderBooking(item)}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={<View testID="coaching-empty">{emptyState}</View>}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      />
    );
  }

  const cancellingBooking = cancellingId
    ? (upcoming.find((b) => b.id === cancellingId) ?? null)
    : null;

  return (
    <ZScreen edges={['top']}>
      {/* Header: title + summary subtitle, permission-gated Book action */}
      <View className="flex-row items-start justify-between gap-3 px-4 pb-3 pt-4">
        <View className="min-w-0 flex-1">
          <Text className="text-xl font-semibold text-z-text">{t('sessions.title')}</Text>
          <Text className="mt-1 text-sm leading-5 text-z-muted">{t('sessions.summary')}</Text>
        </View>
        {canBook ? (
          <ZButton
            testID="coaching-book"
            label={t('common.actions.bookSession')}
            variant="secondary"
            onPress={() => router.push('/book')}
            icon={<CalendarClock color={colors.text} size={16} />}
          />
        ) : null}
      </View>

      <View className="px-4">
        <ZTabs
          testID="coaching-tabs"
          tabs={tabs}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as SessionTab)}
        />
      </View>

      {content}

      {cancellingBooking ? (
        <CancelDialog
          booking={cancellingBooking}
          onDone={() => setCancellingId(null)}
          onAbort={() => setCancellingId(null)}
        />
      ) : null}
    </ZScreen>
  );
}
