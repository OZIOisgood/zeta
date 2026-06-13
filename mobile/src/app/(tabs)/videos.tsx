import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CloudOff, Plus, Video as VideoIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Asset } from '../../api/queries/assets';
import { useAssetsQuery } from '../../api/queries/assets';
import { useAuth } from '../../auth/auth-store';
import { uploadStore, useUploads } from '../../upload/upload-store';
import type { UploadJob } from '../../upload/upload-store';
import { AssetCard } from '../../components/asset-card';
import { UploadProgressCard } from '../../components/upload-progress-card';
import { ZButton } from '../../components/ui/z-button';
import { ZEmptyState } from '../../components/ui/z-empty-state';
import { ZIconButton } from '../../components/ui/z-icon-button';
import { ZPageHeader } from '../../components/ui/z-page-header';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { ZTabs } from '../../components/ui/z-tabs';
import { colors } from '../../theme/colors';

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

export default function VideosScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isPending, isError, refetch, isRefetching } = useAssetsQuery();
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const canCreate = permissions !== null && permissions.includes('assets:create');
  const jobs = useUploads((s) => s.jobs);

  const [activeFilter, setActiveFilter] = useState<VideoFilter>('all');

  const assets = useMemo(() => data ?? [], [data]);
  const reviewedCount = useMemo(() => assets.filter((a) => a.status === 'completed').length, [assets]);
  const toReviewCount = assets.length - reviewedCount;
  const filteredAssets = useMemo(() => filterAssets(assets, activeFilter), [assets, activeFilter]);

  const filterTabs = [
    { id: 'all', label: t('videos.all'), count: assets.length },
    { id: 'toReview', label: t('videos.reviewStatus.toReview'), count: toReviewCount },
    { id: 'reviewed', label: t('videos.reviewStatus.reviewed'), count: reviewedCount },
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
          <ZEmptyState
            title={t('videos.phase4.loadFailed')}
            description={t('videos.phase4.summary')}
            icon={<CloudOff color={colors.danger} size={24} />}
          >
            <ZButton
              label={t('common.actions.retry')}
              variant="secondary"
              onPress={() => void refetch()}
            />
          </ZEmptyState>
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
            icon={<VideoIcon color={colors.primary} size={24} />}
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
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={<JobCards jobs={jobs} />}
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
    <ZScreen edges={['top']}>
      <ZPageHeader title={t('videos.allMyVideos')} subtitle={t('videos.phase4.summary')} />
      {filterRow}
      {content}
      {canCreate && (
        <ZIconButton
          label={t('upload.title')}
          variant="primary"
          size="lg"
          shape="circle"
          onPress={() => router.push('/upload')}
          className="absolute bottom-6 right-6"
        >
          <Plus color={colors.onPrimary} size={24} />
        </ZIconButton>
      )}
    </ZScreen>
  );
}
