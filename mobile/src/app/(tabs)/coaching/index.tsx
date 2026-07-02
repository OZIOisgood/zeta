import { useEffect, useState } from 'react';
import { FlatList, Platform, RefreshControl, Text, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../../../api/queries/coaching';
import { useMyBookingsQuery } from '../../../api/queries/coaching';
import { useNotificationsQuery } from '../../../api/queries/notifications';
import { useAuth } from '../../../auth/auth-store';
import { BookingCard } from '../../../components/booking-card';
import { NotificationBell } from '../../../components/notification-bell';
import { isJoinable } from '../../../lib/connect-window';
import { useHeaderScrollEdge } from '../../../lib/use-header-scroll-edge';
import { Touchable } from '../../../components/ui/touchable';
import { ZEmptyState } from '../../../components/ui/z-empty-state';
import { ZFab } from '../../../components/ui/z-fab';
import { ZQueryError } from '../../../components/ui/z-query-error';
import { ZScreen } from '../../../components/ui/z-screen';
import { ZSkeleton } from '../../../components/ui/z-skeleton';
import { ZSymbol } from '../../../components/ui/z-symbol';
import { ZTabs } from '../../../components/ui/z-tabs';
import { useRoleColors } from '../../../theme/native';

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

// Height of the NativeTabs navigation bar on Android (Material 3 NavigationBar).
// iOS auto-insets via contentInsetAdjustmentBehavior; this constant is Android-only.
const ANDROID_TAB_BAR_HEIGHT = 56;

export default function CoachingScreen() {
  const { t } = useTranslation();
  const { color } = useRoleColors();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, refetch, isRefetching } = useMyBookingsQuery();
  const notifications = useNotificationsQuery();
  const unreadCount = notifications.data?.unread_count ?? 0;
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const currentUserId = useAuth((s) => s.user?.id ?? '');
  const canSeeCoaching = permissions !== null && permissions.includes('coaching:bookings:read');
  const canBook = permissions !== null && permissions.includes('coaching:book');
  const canConnect = permissions !== null && permissions.includes('coaching:video:connect');
  const canManageAvailability =
    permissions !== null && permissions.includes('coaching:availability:manage');

  const [activeTab, setActiveTab] = useState<SessionTab>('upcoming');
  // M3 scroll-edge: flat header at rest, elevated once the list scrolls under it
  // (Android only; iOS large-title header owns its native hairline).
  const onHeaderScroll = useHeaderScrollEdge();

  // Header actions (mirror the handoff TopBar):
  // - The notification bell is present on EVERY tab screen, both platforms, so
  //   headerRight is unconditional.
  // - "Manage Availability" (calendar-cog) precedes the bell on BOTH platforms,
  //   gated by coaching:availability:manage.
  // - "Book session" (+) precedes the bell on iOS only; Android uses the FAB.
  // Multiple headerRight items are composed in a flex row (HIG allows multiple
  // bar button items on the trailing side; availability + book + bell stays
  // within a sane trailing-cluster width).
  // Hoisted hex (stable string dep): `color` is a fresh closure every render —
  // depending on it directly would re-run setOptions each render.
  const accent = color('accent');
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {canManageAvailability ? (
            <Touchable
              testID="coaching-availability-header-btn"
              accessibilityLabel={t('sessions.availability.manageTitle')}
              onPress={() => router.push('/availability' as never)}
              haptic
            >
              <ZSymbol name="calendar-cog" label={t('common.actions.preferences')} size={24} color={accent} />
            </Touchable>
          ) : null}
          {Platform.OS === 'ios' && canBook ? (
            <Touchable
              testID="coaching-book-header-btn"
              accessibilityLabel={t('sessions.bookLive')}
              onPress={() => router.push('/book')}
              haptic
            >
              <ZSymbol name="plus" label={t('common.actions.bookSession')} size={24} color={accent} />
            </Touchable>
          ) : null}
          <NotificationBell unreadCount={unreadCount} onPress={() => router.push('/notifications')} />
        </View>
      ),
    });
  }, [navigation, canManageAvailability, canBook, unreadCount, t, router, accent]);

  // Defensive self-guard: if the user somehow navigates here without the tab
  // permission (e.g. via a deep-link or stat-card tap before permissions resolve),
  // render a no-access state rather than firing a 403-ing query.
  // Mirror: availability.tsx canManage gate pattern.
  if (!canSeeCoaching) {
    return (
      <ZScreen edges={[]}>
        <View testID="coaching-no-permission" className="flex-1 items-center justify-center p-4">
          <ZEmptyState
            title={t('sessions.availability.noPermission')}
            description={t('sessions.availability.noPermissionDescription')}
            icon={<ZSymbol name="calendar" label={t('sessions.availability.noPermission')} size={24} color={color('accent')} />}
          />
        </View>
      </ZScreen>
    );
  }

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
      icon={<ZSymbol name="calendar" label={t(`sessions.empty.${activeTab}Heading`)} size={24} color={color('accent')} />}
    />
  );

  function renderBooking(booking: Booking) {
    const cancellable = activeTab === 'upcoming';
    return (
      <BookingCard
        booking={booking}
        currentUserId={currentUserId}
        canCancel={cancellable}
        onCancel={() => router.push(`/cancel/${booking.id}?groupId=${booking.group_id}`)}
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
        onScroll={onHeaderScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 16 + (Platform.OS === 'android' ? insets.bottom + ANDROID_TAB_BAR_HEIGHT : 0),
          flexGrow: 1,
        }}
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

  return (
    <ZScreen edges={[]}>
      {/* pt-3 gives the segmented breathing room below the large-title header
          (matches the UI kit; the native header provides no bottom inset). */}
      <View className="px-4 pt-3">
        <ZTabs
          testID="coaching-tabs"
          tabs={tabs}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as SessionTab)}
        />
      </View>

      {content}

      {/* Android only: extended Material FAB for the primary "book session"
          action (icon + "Book session" label, hugging its content bottom-right).
          iOS: the same action is a native header-right "+" button (set via
          useEffect above). Availability is in the header on both platforms. */}
      {Platform.OS === 'android' && canBook ? (
        <ZFab
          testID="coaching-book"
          label={t('common.actions.bookSession')}
          icon={<ZSymbol name="calendar-plus" label={t('common.actions.bookSession')} size={24} color={color('onAccent')} />}
          onPress={() => router.push('/book')}
          className="absolute right-6"
          style={{ bottom: insets.bottom + ANDROID_TAB_BAR_HEIGHT + 16 }}
        />
      ) : null}
    </ZScreen>
  );
}
