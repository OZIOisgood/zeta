import { useEffect, useState } from 'react';
import { FlatList, Platform, RefreshControl, Text, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../../../api/queries/coaching';
import {
  useMyBookingsQuery,
  useCancelBookingMutation,
  formatBookingDateTime,
} from '../../../api/queries/coaching';
import { useAuth } from '../../../auth/auth-store';
import { BookingCard } from '../../../components/booking-card';
import { isJoinable } from '../../../lib/connect-window';
import { Touchable } from '../../../components/ui/touchable';
import { ZConfirmDialog } from '../../../components/ui/z-confirm-dialog';
import { ZEmptyState } from '../../../components/ui/z-empty-state';
import { ZIconButton } from '../../../components/ui/z-icon-button';
import { ZQueryError } from '../../../components/ui/z-query-error';
import { ZScreen } from '../../../components/ui/z-screen';
import { ZSkeleton } from '../../../components/ui/z-skeleton';
import { ZSymbol } from '../../../components/ui/z-symbol';
import { ZTabs } from '../../../components/ui/z-tabs';
import { ZTextarea } from '../../../components/ui/z-textarea';
import { showToast } from '../../../components/ui/z-toast';
import { colors } from '../../../theme/colors';

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
 * the mutation for that booking's group. Composes ZConfirmDialog (danger tone)
 * with a ZTextarea slot so the student can attach an optional reason, which is
 * passed through to the mutation.
 */
function CancelDialog({
  booking,
  currentUserId,
  onDone,
  onAbort,
}: {
  booking: Booking;
  currentUserId: string;
  onDone: () => void;
  onAbort: () => void;
}) {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useCancelBookingMutation(booking.group_id);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Counterpart + formatted time for the descriptive context line, mirroring
  // web cancelDescription(): the student sees the expert, the expert the student.
  const otherParty =
    booking.student_id === currentUserId
      ? (booking.expert_name ?? booking.expert_id)
      : (booking.student_name ?? booking.student_id);
  const scheduledAt = formatBookingDateTime(booking.scheduled_at);

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
    <ZConfirmDialog
      visible
      tone="danger"
      testID="booking-cancel-dialog"
      title={t('sessions.cancel.title')}
      description={t('sessions.cancel.descriptionText', { otherParty, scheduledAt })}
      confirmLabel={t('sessions.cancel.title')}
      cancelLabel={t('sessions.cancel.keep')}
      confirmDisabled={isPending}
      onConfirm={() => void handleConfirm()}
      onCancel={onAbort}
    >
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
        {error ? <Text className="mt-2 text-sm text-z-danger">{error}</Text> : null}
      </View>
    </ZConfirmDialog>
  );
}

export default function CoachingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { data, isPending, isError, refetch, isRefetching } = useMyBookingsQuery();
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const currentUserId = useAuth((s) => s.user?.id ?? '');
  const canBook = permissions !== null && permissions.includes('coaching:book');
  const canConnect = permissions !== null && permissions.includes('coaching:video:connect');
  const canManageAvailability =
    permissions !== null && permissions.includes('coaching:availability:manage');

  const [activeTab, setActiveTab] = useState<SessionTab>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Header actions:
  // - "Manage Availability" (calendar-cog) goes to headerRight on BOTH platforms,
  //   gated by coaching:availability:manage.
  // - "Book session" (+) goes to headerRight on iOS only; Android uses the FAB.
  // Multiple headerRight items are composed in a flex row (HIG allows multiple
  // bar button items on the trailing side; two icons is the safe limit).
  useEffect(() => {
    const hasActions = canManageAvailability || (Platform.OS === 'ios' && canBook);
    navigation.setOptions({
      headerRight: hasActions
        ? () => (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {canManageAvailability ? (
                <Touchable
                  testID="coaching-availability-header-btn"
                  accessibilityLabel={t('sessions.availability.manageTitle')}
                  onPress={() => router.push('/availability' as never)}
                  haptic
                >
                  <ZSymbol name="calendar-cog" label={t('common.actions.preferences')} size={24} color={colors.primary} />
                </Touchable>
              ) : null}
              {Platform.OS === 'ios' && canBook ? (
                <Touchable
                  testID="coaching-book-header-btn"
                  accessibilityLabel={t('sessions.bookLive')}
                  onPress={() => router.push('/book')}
                  haptic
                >
                  <ZSymbol name="plus" label={t('common.actions.bookSession')} size={24} color={colors.primary} />
                </Touchable>
              ) : null}
            </View>
          )
        : undefined,
    });
  }, [navigation, canManageAvailability, canBook, t, router]);

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
      icon={<ZSymbol name="calendar" label={t(`sessions.empty.${activeTab}Heading`)} size={24} color={colors.primary} />}
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
        <ZQueryError
          title={t('sessions.loadFailed')}
          retryLabel={t('upload.retry')}
          onRetry={() => void refetch()}
        />
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
        ListEmptyComponent={
          <View testID="coaching-empty" className="flex-1 justify-center">
            {emptyState}
          </View>
        }
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
          currentUserId={currentUserId}
          onDone={() => setCancellingId(null)}
          onAbort={() => setCancellingId(null)}
        />
      ) : null}

      {/* Android only: Material FAB for the primary "book session" action.
          iOS: the same action is a native header-right "+" button (set via
          useEffect above). Availability is in the header on both platforms. */}
      {Platform.OS === 'android' && canBook ? (
        <ZIconButton
          testID="coaching-book"
          label={t('sessions.bookLive')}
          variant="primary"
          size="lg"
          shape="circle"
          onPress={() => router.push('/book')}
          className="absolute bottom-6 right-6"
        >
          <ZSymbol name="calendar-plus" label={t('common.actions.bookSession')} size={24} color={colors.onPrimary} />
        </ZIconButton>
      ) : null}
    </ZScreen>
  );
}
