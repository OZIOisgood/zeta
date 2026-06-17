import { useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, RefreshControl, Text, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { Asset } from '../../../api/queries/assets';
import { useAssetsQuery } from '../../../api/queries/assets';
import { useNotificationsQuery } from '../../../api/queries/notifications';
import { useAuth } from '../../../auth/auth-store';
import { uploadStore, useUploads } from '../../../upload/upload-store';
import type { UploadJob } from '../../../upload/upload-store';
import { AssetCard } from '../../../components/asset-card';
import { NotificationBell } from '../../../components/notification-bell';
import { UploadProgressCard } from '../../../components/upload-progress-card';
import { ZButton } from '../../../components/ui/z-button';
import { ZEmptyState } from '../../../components/ui/z-empty-state';
import { ZFab } from '../../../components/ui/z-fab';
import { ZQueryError } from '../../../components/ui/z-query-error';
import { ZScreen } from '../../../components/ui/z-screen';
import { ZSkeleton } from '../../../components/ui/z-skeleton';
import { ZSymbol } from '../../../components/ui/z-symbol';
import { ZTabs } from '../../../components/ui/z-tabs';
import { Touchable } from '../../../components/ui/touchable';
import { useHeaderScrollEdge } from '../../../lib/use-header-scroll-edge';
import { colors } from '../../../theme/colors';

type VideoFilter = 'all' | 'toReview' | 'reviewed';

// Mirror the web VideoFilter logic (videos-page.component.ts): reviewed videos
// are those whose review finished (status 'completed'); everything else is still
// "to review".
function filterAssets(assets: Asset[], filter: VideoFilter): Asset[] {
  if (filter === 'reviewed') return assets.filter((a) => a.status === 'completed');
  if (filter === 'toReview') return assets.filter((a) => a.status !== 'completed');
  return assets;
}

function ListSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} testID="asset-skeleton" className="flex-row gap-3 rounded-lg border border-z-border bg-z-surface p-3">
          <ZSkeleton className="h-16 w-24" />
          <View className="flex-1 justify-center gap-2">
            <ZSkeleton className="h-4 w-3/5" />
            <ZSkeleton className="h-3 w-2/5" />
          </View>
        </View>
      ))}
    </View>
  );
}

function JobCards({ jobs }: { jobs: UploadJob[] }) {
  if (jobs.length === 0) return null;
  return (
    <View className="gap-2 p-4 pb-0">
      {jobs.map((j) => (
        <UploadProgressCard
          key={j.id}
          job={j}
          onRetry={(id, vid) => void uploadStore.getState().retryFile(id, vid)}
          onDismiss={(id) => uploadStore.getState().dismissJob(id)}
        />
      ))}
    </View>
  );
}

// Height of the NativeTabs navigation bar on Android (Material 3 NavigationBar).
// iOS auto-insets via contentInsetAdjustmentBehavior; this constant is Android-only.
const ANDROID_TAB_BAR_HEIGHT = 56;

export default function VideosScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, refetch, isRefetching } = useAssetsQuery();
  const notifications = useNotificationsQuery();
  const unreadCount = notifications.data?.unread_count ?? 0;
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const canCreate = permissions !== null && permissions.includes('assets:create');
  const jobs = useUploads((s) => s.jobs);
  // M3 scroll-edge: flat header at rest, elevated once the list scrolls under it
  // (Android only; iOS large-title header owns its native hairline).
  const onHeaderScroll = useHeaderScrollEdge();

  // Bottom padding for Android lists: clears the opaque NativeTabs NavigationBar
  // (height constant) plus the system gesture/home-indicator inset.
  // iOS uses contentInsetAdjustmentBehavior='automatic' which auto-insets for UITabBar.
  const androidListPaddingBottom =
    Platform.OS === 'android' ? insets.bottom + ANDROID_TAB_BAR_HEIGHT : 0;

  // Header-right actions (mirror the handoff TopBar):
  //  - The notification bell is present on EVERY tab screen, both platforms.
  //  - iOS additionally surfaces the primary "create video" "+" here (iOS has no
  //    FAB); Android surfaces create via the Material FAB rendered below in JSX.
  // headerRight is therefore always set (the bell is unconditional); on iOS it
  // composes the create "+" before the bell in a trailing flex row.
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {Platform.OS === 'ios' && canCreate ? (
            <Touchable
              testID="videos-create-header-btn"
              accessibilityLabel={t('upload.title')}
              onPress={() => router.push('/upload')}
              haptic
            >
              <ZSymbol name="plus" label={t('common.actions.add')} size={24} color={colors.primary} />
            </Touchable>
          ) : null}
          <NotificationBell unreadCount={unreadCount} onPress={() => router.push('/notifications')} />
        </View>
      ),
    });
  }, [navigation, canCreate, unreadCount, t, router]);

  const [activeFilter, setActiveFilter] = useState<VideoFilter>('all');

  const assets = useMemo(() => data ?? [], [data]);
  const filteredAssets = useMemo(() => filterAssets(assets, activeFilter), [assets, activeFilter]);

  const filterTabs = [
    { id: 'all', label: t('videos.all') },
    { id: 'toReview', label: t('videos.reviewStatus.toReview') },
    { id: 'reviewed', label: t('videos.reviewStatus.reviewed') },
  ];

  const filterRow =
    !isPending && !isError ? (
      <View className="px-4">
        <ZTabs
          testID="videos-filter-tabs"
          tabs={filterTabs}
          activeId={activeFilter}
          onChange={(id) => setActiveFilter(id as VideoFilter)}
        />
      </View>
    ) : null;

  let content: React.ReactNode;

  if (isPending) {
    content = (
      <View className="flex-1 bg-z-bg">
        <JobCards jobs={jobs} />
        <ListSkeleton />
      </View>
    );
  } else if (isError) {
    content = (
      <View className="flex-1 bg-z-bg">
        <JobCards jobs={jobs} />
        <View className="flex-1 justify-center p-4">
          <ZQueryError
            title={t('videos.phase4.loadFailed')}
            description={t('videos.phase4.summary')}
            onRetry={() => void refetch()}
          />
        </View>
      </View>
    );
  } else if (filteredAssets.length === 0) {
    // Empty copy mirrors the web page: distinguish "no videos at all" from
    // "no videos match the active filter".
    const noVideosAtAll = assets.length === 0;
    content = (
      <View testID="videos-empty" className="flex-1 bg-z-bg">
        <JobCards jobs={jobs} />
        <View className="flex-1 justify-center p-4">
          <ZEmptyState
            title={noVideosAtAll ? t('videos.noVideosYet') : t('videos.noVideosMatch')}
            description={
              noVideosAtAll ? t('videos.uploadFirstDescription') : t('videos.noVideosForStatuses')
            }
            icon={<ZSymbol name="video" label={t('videos.title')} size={24} color={colors.primary} />}
          >
            {canCreate ? (
              <ZButton label={t('videos.uploadFirst')} onPress={() => router.push('/upload')} />
            ) : null}
          </ZEmptyState>
        </View>
      </View>
    );
  } else {
    content = (
      <View className="flex-1 bg-z-bg">
        <FlatList
          data={filteredAssets}
          keyExtractor={(a) => a.id}
          onScroll={onHeaderScroll}
          scrollEventThrottle={16}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, paddingBottom: 16 + androidListPaddingBottom }}
          ListHeaderComponent={
            <>
              <JobCards jobs={jobs} />
              <Text
                testID="videos-count-overline"
                className="pb-2 text-[12.5px] font-bold uppercase tracking-wider text-z-muted"
              >
                {t('videos.videoCount', { count: assets.length })}
              </Text>
            </>
          }
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          renderItem={({ item }) => (
            <AssetCard asset={item} onPress={() => router.push(`/asset/${item.id}`)} />
          )}
        />
      </View>
    );
  }

  return (
    <ZScreen edges={[]}>

      {filterRow}
      {content}
      {/* Android only: Material FAB for the primary create action.
          iOS: the same action is surfaced via the native header-right button
          set in the useEffect above (per mobile/AGENTS.md SOTA-as-default). */}
      {Platform.OS === 'android' && canCreate && (
        <ZFab
          testID="videos-create-fab"
          // Compact icon-only "+" FAB (handoff): the collapsed M3 medium FAB,
          // ~56dp square, hugging its content at the bottom-right — never the
          // extended/full-width pill.
          extended={false}
          label={t('common.actions.uploadVideo')}
          icon={<ZSymbol name="plus" label={t('common.actions.add')} size={24} color={colors.onPrimary} />}
          onPress={() => router.push('/upload')}
          className="absolute right-6"
          style={{ bottom: insets.bottom + ANDROID_TAB_BAR_HEIGHT + 16 }}
        />
      )}
    </ZScreen>
  );
}
