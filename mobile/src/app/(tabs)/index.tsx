import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, CloudOff, Users, Video as VideoIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAssetsQuery } from '../../api/queries/assets';
import { useGroupsQuery } from '../../api/queries/groups';
import { useMyBookingsQuery } from '../../api/queries/coaching';
import { useAuth } from '../../auth/auth-store';
import { AssetCard } from '../../components/asset-card';
import { FirstStepRow } from '../../components/first-step-row';
import { StatCard } from '../../components/stat-card';
import { ZButton } from '../../components/ui/z-button';
import { ZCard } from '../../components/ui/z-card';
import { ZEmptyState } from '../../components/ui/z-empty-state';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { colors } from '../../theme/colors';

// Mirror the web home page: surface only the five most recent videos in the
// preview; the full list lives in the Videos tab behind "View all".
const LATEST_VIDEOS_LIMIT = 5;

type HomeStep = {
  completed: boolean;
  labelKey: string;
  descriptionKey: string;
  onPress: () => void;
  testID: string;
};

function RowSkeleton() {
  return (
    <View testID="home-video-skeleton" className="flex-row gap-3 py-2">
      <ZSkeleton className="h-14 w-20 rounded-md" />
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
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const has = (perm: string) => permissions !== null && permissions.includes(perm);

  const assets = useAssetsQuery();
  const groups = useGroupsQuery();
  const bookings = useMyBookingsQuery();

  const videoList = useMemo(() => assets.data ?? [], [assets.data]);
  const groupList = useMemo(() => groups.data ?? [], [groups.data]);

  // Mirror the coaching screen: derive the upcoming count in the render body so
  // "now" is read at render time (a memo would let the lint purity rule flag the
  // clock read). Pending/done bookings scheduled in the future are "upcoming".
  const nowMs = new Date().getTime();
  const upcomingCount = (bookings.data ?? []).filter(
    (b) => b.status !== 'cancelled' && new Date(b.scheduled_at).getTime() > nowMs,
  ).length;

  const latestVideos = useMemo(
    () => videoList.slice(0, LATEST_VIDEOS_LIMIT),
    [videoList],
  );

  // First-steps onboarding, mirroring the web home steps() computed but pointing
  // at the routes that exist in the mobile app. Each step is permission-gated and
  // marked complete from the same live data the web uses.
  const hasGroups = groupList.length > 0;
  const hasVideos = videoList.length > 0;
  const hasReviewedVideos = videoList.some((a) => a.status === 'completed');
  const firstGroupId = groupList[0]?.id;

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
          hasGroups && firstGroupId
            ? router.push(`/group/${firstGroupId}`)
            : router.push('/groups'),
        testID: 'first-step-groups',
      });
    }

    if (has('assets:create')) {
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
        labelKey:
          upcomingCount > 0 ? 'home.firstSteps.coachingBooked' : 'home.firstSteps.bookLiveCoaching',
        descriptionKey:
          upcomingCount > 0
            ? 'home.firstSteps.coachingBookedDescription'
            : 'home.firstSteps.bookLiveCoachingDescription',
        onPress: () => router.push(upcomingCount > 0 ? '/coaching' : '/book'),
        testID: 'first-step-coaching',
      });
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions, hasGroups, hasVideos, hasReviewedVideos, firstGroupId, upcomingCount]);

  // Match the web showFirstSteps: only after groups + videos resolve, and only
  // while at least one step is still incomplete.
  const loaded = groups.isSuccess && assets.isSuccess;
  const showFirstSteps = loaded && steps.some((step) => !step.completed);

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
      <ZEmptyState
        title={t('videos.phase4.loadFailed')}
        description={t('home.error.description')}
        icon={<CloudOff color={colors.danger} size={24} />}
      >
        <ZButton
          label={t('common.actions.retry')}
          variant="secondary"
          onPress={() => void assets.refetch()}
        />
      </ZEmptyState>
    );
  } else if (latestVideos.length === 0) {
    latestContent = (
      <ZEmptyState
        title={t('videos.noVideosYet')}
        description={t('videos.uploadFirstDescription')}
        icon={<VideoIcon color={colors.primary} size={24} />}
      />
    );
  } else {
    latestContent = (
      <View testID="latest-videos-list">
        {latestVideos.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onPress={() => router.push(`/asset/${asset.id}`)}
          />
        ))}
      </View>
    );
  }

  return (
    <ZScreen edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Stat cards: live counts that double as section navigation. */}
        <View className="flex-row gap-3">
          <StatCard
            testID="stat-card-videos"
            label={t('videos.title')}
            count={videoList.length}
            icon={<VideoIcon color={colors.primary} size={18} />}
            onPress={() => router.push('/videos')}
          />
          <StatCard
            testID="stat-card-groups"
            label={t('groups.myGroups')}
            count={groupList.length}
            icon={<Users color={colors.primary} size={18} />}
            onPress={() => router.push('/groups')}
          />
          <StatCard
            testID="stat-card-sessions"
            label={t('home.upcomingCoachingSessions')}
            count={upcomingCount}
            icon={<CalendarDays color={colors.primary} size={18} />}
            onPress={() => router.push('/coaching')}
          />
        </View>

        {/* Latest videos preview, bounded to the five most recent. */}
        <ZCard testID="latest-videos-card">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-base font-semibold text-z-text">
                {t('home.latestVideos')}
              </Text>
              <Text className="mt-1 text-sm leading-5 text-z-muted">
                {t('home.firstSteps.videoUploadedDescription')}
              </Text>
            </View>
            <ZButton
              testID="latest-videos-view-all"
              label={t('common.actions.viewAll')}
              variant="ghost"
              onPress={() => router.push('/videos')}
            />
          </View>
          <View className="mt-4">{latestContent}</View>
        </ZCard>

        {/* Permission-gated onboarding checklist. */}
        {showFirstSteps ? (
          <ZCard testID="first-steps-card">
            <Text className="text-sm font-semibold text-z-text">
              {t('home.firstSteps.title')}
            </Text>
            <View className="mt-4 gap-3">
              {steps.map((step) => (
                <FirstStepRow
                  key={step.labelKey}
                  testID={step.testID}
                  label={t(step.labelKey)}
                  description={t(step.descriptionKey)}
                  completed={step.completed}
                  onPress={step.onPress}
                />
              ))}
            </View>
          </ZCard>
        ) : null}
      </ScrollView>
    </ZScreen>
  );
}
