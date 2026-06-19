import { useEffect, useMemo } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAssetsQuery } from '../../../api/queries/assets';
import { useGroupsQuery } from '../../../api/queries/groups';
import { useMyAvailabilityQuery, useMyBookingsQuery } from '../../../api/queries/coaching';
import { useNotificationsQuery } from '../../../api/queries/notifications';
import { useAuth } from '../../../auth/auth-store';
import { AssetCard } from '../../../components/asset-card';
import { FirstStepRow } from '../../../components/first-step-row';
import { NextSessionCard } from '../../../components/next-session-card';
import { NotificationBell } from '../../../components/notification-bell';
import { ZAvatar } from '../../../components/ui/z-avatar';
import { ZButton } from '../../../components/ui/z-button';
import { ZCard } from '../../../components/ui/z-card';
import { ZDivider } from '../../../components/ui/z-divider';
import { ZEmptyState } from '../../../components/ui/z-empty-state';
import { ZProgress } from '../../../components/ui/z-progress';
import { ZQueryError } from '../../../components/ui/z-query-error';
import { ZScreen } from '../../../components/ui/z-screen';
import { ZSkeleton } from '../../../components/ui/z-skeleton';
import { ZSymbol } from '../../../components/ui/z-symbol';
import { isJoinable } from '../../../lib/connect-window';
import { colors } from '../../../theme/colors';

const LATEST_VIDEOS_LIMIT = 4;
const ANDROID_TAB_BAR_HEIGHT = 56;

type HomeStep = {
  completed: boolean;
  labelKey: string;
  descriptionKey: string;
  onPress: () => void;
  testID: string;
};

function greetingKey(hour: number): string {
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

function initials(first?: string, last?: string): string {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}` || '?';
}

function RowSkeleton() {
  return (
    <View testID="home-video-skeleton" className="flex-row gap-3 py-2">
      <ZSkeleton className="h-[70px] w-[104px] rounded-2xl" />
      <View className="flex-1 justify-center gap-2">
        <ZSkeleton className="h-4 w-3/5" />
        <ZSkeleton className="h-3 w-2/5" />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const user = useAuth((s) => s.user);
  const permissions = user?.permissions ?? null;
  const has = (perm: string) => permissions !== null && permissions.includes(perm);
  const canCreate = has('assets:create');
  const canBook = has('coaching:book');
  const canConnect = has('coaching:video:connect');

  const assets = useAssetsQuery();
  const groups = useGroupsQuery();
  const bookings = useMyBookingsQuery();
  const notifications = useNotificationsQuery();
  const unreadCount = notifications.data?.unread_count ?? 0;

  // In-content greeting replaces the native header on both platforms.
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const videoList = useMemo(() => assets.data ?? [], [assets.data]);
  const groupList = useMemo(() => groups.data ?? [], [groups.data]);

  const nowMs = new Date().getTime();
  const upcoming = (bookings.data ?? [])
    .filter((b) => b.status !== 'cancelled' && new Date(b.scheduled_at).getTime() > nowMs)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const upcomingCount = upcoming.length;
  const nextBooking = upcoming[0] ?? null;

  // Gate the hero Join button on the same contract as the coaching screen:
  // the user can connect AND the session is inside its join window. Read the
  // clock in the render body (not a memo) to keep the deps lint happy.
  const canJoinNext = !!nextBooking && canConnect && isJoinable(nextBooking, new Date());

  const latestVideos = useMemo(() => videoList.slice(0, LATEST_VIDEOS_LIMIT), [videoList]);

  const hasGroups = groupList.length > 0;
  const hasVideos = videoList.length > 0;
  const hasReviewedVideos = videoList.some((a) => a.status === 'completed');
  const firstGroupId = groupList[0]?.id;

  const availabilityQuery = useMyAvailabilityQuery(
    has('coaching:availability:manage') ? (firstGroupId ?? '') : '',
  );
  const hasAvailability = (availabilityQuery.data ?? []).length > 0;

  const steps = useMemo<HomeStep[]>(() => {
    const list: HomeStep[] = [];
    if (has('groups:read')) {
      list.push({
        completed: hasGroups,
        labelKey: hasGroups ? 'home.firstSteps.groupCreated' : 'home.firstSteps.createGroup',
        descriptionKey: hasGroups
          ? 'home.firstSteps.groupCreatedDescription'
          : 'home.firstSteps.createGroupDescription',
        onPress: () =>
          hasGroups && firstGroupId ? router.push(`/group/${firstGroupId}`) : router.push('/groups'),
        testID: 'first-step-groups',
      });
    }
    if (canCreate) {
      list.push({
        completed: hasVideos,
        labelKey: hasVideos ? 'home.firstSteps.videoUploaded' : 'home.firstSteps.uploadFirstVideo',
        descriptionKey: hasVideos
          ? 'home.firstSteps.videoUploadedDescription'
          : 'home.firstSteps.uploadFirstVideoDescription',
        onPress: () => router.push(hasVideos ? '/videos' : '/upload'),
        testID: 'first-step-upload',
      });
    }
    if (has('reviews:read')) {
      list.push({
        completed: hasReviewedVideos,
        labelKey: 'home.firstSteps.reviewVideos',
        descriptionKey: 'home.firstSteps.reviewVideosDescription',
        onPress: () => router.push('/videos'),
        testID: 'first-step-review',
      });
    }
    if (has('coaching:book')) {
      list.push({
        completed: upcomingCount > 0,
        labelKey: upcomingCount > 0 ? 'home.firstSteps.coachingBooked' : 'home.firstSteps.bookLiveCoaching',
        descriptionKey:
          upcomingCount > 0
            ? 'home.firstSteps.coachingBookedDescription'
            : 'home.firstSteps.bookLiveCoachingDescription',
        onPress: () => router.push(upcomingCount > 0 ? '/coaching' : '/book'),
        testID: 'first-step-coaching',
      });
    }
    if (has('coaching:availability:manage')) {
      list.push({
        completed: hasAvailability,
        labelKey: 'home.firstSteps.setAvailability',
        descriptionKey: 'home.firstSteps.setAvailabilityDescription',
        onPress: () => router.push('/availability' as never),
        testID: 'first-step-availability',
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions, hasGroups, hasVideos, hasReviewedVideos, firstGroupId, upcomingCount, hasAvailability]);

  const loaded = groups.isSuccess && assets.isSuccess;
  const showFirstSteps = loaded && steps.some((step) => !step.completed);
  const completedCount = steps.filter((s) => s.completed).length;

  let latestContent: React.ReactNode;
  if (assets.isPending) {
    latestContent = (
      <View className="gap-1">
        <RowSkeleton />
        <RowSkeleton />
      </View>
    );
  } else if (assets.isError) {
    latestContent = (
      <ZQueryError title={t('videos.phase4.loadFailed')} onRetry={() => void assets.refetch()} />
    );
  } else if (latestVideos.length === 0) {
    latestContent = (
      <ZEmptyState
        title={t('videos.noVideosYet')}
        description={t('videos.uploadFirstDescription')}
        icon={<ZSymbol name="video" label={t('videos.title')} size={24} color={colors.primary} />}
      >
        {canCreate ? (
          <ZButton
            testID="latest-videos-upload"
            label={t('videos.uploadNew')}
            onPress={() => router.push('/upload')}
          />
        ) : null}
      </ZEmptyState>
    );
  } else {
    latestContent = (
      <View testID="latest-videos-list" className="gap-3">
        {latestVideos.map((asset) => (
          <AssetCard key={asset.id} asset={asset} onPress={() => router.push(`/asset/${asset.id}`)} />
        ))}
      </View>
    );
  }

  return (
    <ZScreen edges={['top']}>
      {/* Module 1: greeting header (outside the scroll, sticky-feeling) */}
      <View className="flex-row items-center gap-3 px-4 pb-3.5 pt-2">
        <ZAvatar
          tone="accent"
          shape="circle"
          size={44}
          fallback={initials(user?.first_name, user?.last_name)}
          image={user?.avatar || undefined}
          alt={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()}
        />
        <View className="min-w-0 flex-1">
          <Text className="text-[13px] font-semibold text-z-muted">{t(greetingKey(new Date().getHours()))}</Text>
          <Text
            numberOfLines={1}
            className="text-[22px] font-extrabold text-z-text"
            style={{ letterSpacing: -0.44 }}
          >
            {user?.first_name ?? ''}
          </Text>
        </View>
        <NotificationBell unreadCount={unreadCount} onPress={() => router.push('/notifications')} />
      </View>

      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: 16 + (Platform.OS === 'android' ? insets.bottom + ANDROID_TAB_BAR_HEIGHT : 0),
          gap: 22,
        }}
      >
        {/* Module 2: next-session hero (renders nothing when no booking & cannot book) */}
        {loaded ? (
          <NextSessionCard
            booking={nextBooking}
            currentUserId={user?.id ?? ''}
            canBook={canBook}
            canJoin={canJoinNext}
            onJoin={() => nextBooking && router.push(`/call/${nextBooking.id}?groupId=${nextBooking.group_id}`)}
            onDetails={() => router.push('/coaching')}
            onBook={() => router.push('/book')}
          />
        ) : null}

        {/* Module 3: your videos */}
        <View className="px-4">
          <View className="mb-2.5 flex-row items-center justify-between">
            <Text numberOfLines={1} className="text-[19px] font-extrabold text-z-text">
              {t('home.latestVideos')}
            </Text>
            <ZButton
              testID="latest-videos-view-all"
              label={t('common.actions.viewAll')}
              variant="link"
              onPress={() => router.push('/videos')}
            />
          </View>
          {latestContent}
        </View>

        {/* Module 4: first-steps progress card */}
        {showFirstSteps ? (
          <ZCard testID="first-steps-card" className="mx-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-[19px] font-extrabold text-z-text">{t('home.firstSteps.title')}</Text>
              <Text className="text-xs font-medium text-z-muted">
                {completedCount}/{steps.length}
              </Text>
            </View>
            <ZProgress
              testID="first-steps-progress"
              value={steps.length ? completedCount / steps.length : 0}
              className="mt-3"
            />
            <View className="mt-2">
              {steps.map((step, index) => (
                <View key={step.labelKey}>
                  {index > 0 ? <ZDivider /> : null}
                  <FirstStepRow
                    testID={step.testID}
                    label={t(step.labelKey)}
                    description={t(step.descriptionKey)}
                    completed={step.completed}
                    onPress={step.onPress}
                  />
                </View>
              ))}
            </View>
          </ZCard>
        ) : null}
      </ScrollView>
    </ZScreen>
  );
}
