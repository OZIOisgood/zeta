import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarClock, CloudOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../../api/queries/coaching';
import { useMyBookingsQuery, useCancelBookingMutation } from '../../api/queries/coaching';
import { useAuth } from '../../auth/auth-store';
import { BookingCard } from '../../components/booking-card';
import { isJoinable } from '../../lib/connect-window';
import { ZButton } from '../../components/ui/z-button';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { colors } from '../../theme/colors';

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
 * CancelConfirm owns the useCancelBookingMutation hook for a single booking.
 * React rules forbid calling hooks in loops, so each pending cancel action
 * gets its own component instance that holds the mutation for that booking's
 * group.
 */
function CancelConfirm({
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
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      await mutateAsync({ bookingId: booking.id });
      onDone();
    } catch {
      setError(t('sessions.cancel.failed'));
    }
  }

  return (
    <View className="mt-2 gap-2">
      <View className="flex-row gap-2">
        <View className="flex-1">
          <ZButton
            testID="booking-cancel-confirm"
            label={t('sessions.cancel.title')}
            variant="danger"
            disabled={isPending}
            onPress={() => void handleConfirm()}
          />
        </View>
        <View className="flex-1">
          <ZButton
            label={t('common.actions.cancel')}
            variant="ghost"
            onPress={onAbort}
          />
        </View>
      </View>
      {error ? <Text className="text-sm text-z-danger">{error}</Text> : null}
    </View>
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

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const now = new Date();

  const upcoming =
    data
      ?.filter((b) => b.status === 'pending' && new Date(b.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()) ??
    [];

  const past =
    data
      ?.filter((b) => !(b.status === 'pending' && new Date(b.scheduled_at) > now))
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()) ??
    [];

  let content: React.ReactNode;

  if (isPending) {
    content = (
      <View className="flex-1 bg-z-bg">
        <ListSkeleton />
      </View>
    );
  } else if (isError) {
    content = (
      <View className="flex-1 items-center justify-center gap-4 bg-z-bg px-8">
        <CloudOff color={colors.muted} size={32} />
        <Text className="text-center text-z-muted">{t('sessions.loadFailed')}</Text>
        <ZButton label={t('upload.retry')} variant="secondary" onPress={() => void refetch()} />
      </View>
    );
  } else if (upcoming.length === 0 && past.length === 0) {
    content = (
      <View testID="coaching-empty" className="flex-1 items-center justify-center gap-3 bg-z-bg px-8">
        <CalendarClock color={colors.muted} size={32} />
        <Text className="text-lg font-semibold text-z-text">
          {t('sessions.empty.upcomingHeading')}
        </Text>
        <Text className="text-center text-z-muted">
          {t('sessions.empty.upcomingDescription')}
        </Text>
      </View>
    );
  } else {
    content = (
      <ScrollView
        className="flex-1 bg-z-bg"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      >
        {upcoming.length > 0 ? (
          <View testID="coaching-upcoming" className="gap-2">
            <Text className="text-base font-semibold text-z-text">
              {t('sessions.tabs.upcoming')}
            </Text>
            {upcoming.map((booking) => (
              <View key={booking.id}>
                <BookingCard
                  booking={booking}
                  currentUserId={currentUserId}
                  canCancel={confirmingId !== booking.id}
                  onCancel={() => setConfirmingId(booking.id)}
                  onOpenRecording={(assetId) => router.push(`/asset/${assetId}`)}
                  onJoin={
                    canConnect && isJoinable(booking, now)
                      ? () => router.push(`/call/${booking.id}?groupId=${booking.group_id}`)
                      : undefined
                  }
                />
                {confirmingId === booking.id ? (
                  <CancelConfirm
                    booking={booking}
                    onDone={() => setConfirmingId(null)}
                    onAbort={() => setConfirmingId(null)}
                  />
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {past.length > 0 ? (
          <View testID="coaching-past" className={`gap-2 ${upcoming.length > 0 ? 'mt-6' : ''}`}>
            <Text className="text-base font-semibold text-z-text">
              {t('sessions.tabs.past')}
            </Text>
            {past.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                currentUserId={currentUserId}
                canCancel={false}
                onCancel={() => {}}
                onOpenRecording={(assetId) => router.push(`/asset/${assetId}`)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <ZScreen edges={['top']}>
      {/* Header row */}
      <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <Text className="text-xl font-semibold text-z-text">{t('common.nav.sessions')}</Text>
        {canBook ? (
          <ZButton
            testID="coaching-book"
            label={t('common.actions.bookSession')}
            variant="secondary"
            onPress={() =>
              router.push('/book')
            }
            icon={<CalendarClock color={colors.text} size={16} />}
          />
        ) : null}
      </View>
      {content}
    </ZScreen>
  );
}
