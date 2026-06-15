import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ZSymbol } from '../components/ui/z-symbol';
import {
  buildReport,
  canStepForward,
  currentCursor,
  durationHM,
  isCurrentPeriod,
  quarterOf,
  stepCursor,
  useReportEventsQuery,
  videoClock,
  type Cursor,
  type Granularity,
  type ReportEvent,
} from '../api/queries/reports';
import { formatDate, formatMonthYear } from '../lib/datetime';
import { StatCard } from '../components/stat-card';
import { ZBadge } from '../components/ui/z-badge';
import { ZButton } from '../components/ui/z-button';
import { ZCard } from '../components/ui/z-card';
import { ZEmptyState } from '../components/ui/z-empty-state';
import { ZIconButton } from '../components/ui/z-icon-button';
import { ZIconTile } from '../components/ui/z-icon-tile';
import { ZQueryError } from '../components/ui/z-query-error';
import { ZScreen } from '../components/ui/z-screen';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZTabs, type ZTab } from '../components/ui/z-tabs';
import { colors } from '../theme/colors';

const GRANULARITIES: readonly Granularity[] = ['month', 'quarter', 'year'] as const;

// Whole-minute aggregate duration for the stat-tile trailing badge — mirrors the
// web `fmtDuration` (reports-page.component.ts): "1 hr 12 min" / "48 min".
function fmtDuration(totalSec: number, t: (k: string) => string): string {
  const { hours, minutes } = durationHM(totalSec);
  const h = t('reports.unit.hour');
  const m = t('reports.unit.minute');
  if (hours && minutes) return `${hours} ${h} ${minutes} ${m}`;
  if (hours) return `${hours} ${h}`;
  return `${minutes} ${m}`;
}

function Skeletons() {
  return (
    <View testID="reports-skeleton" className="gap-4 p-4">
      <ZSkeleton className="h-10 w-full" />
      <View className="flex-row gap-3">
        <ZSkeleton className="h-24 flex-1" />
        <ZSkeleton className="h-24 flex-1" />
        <ZSkeleton className="h-24 flex-1" />
      </View>
      <ZSkeleton className="h-40 w-full" />
    </View>
  );
}

export default function ReportsScreen() {
  const { t } = useTranslation();
  const { data, isPending, isError, isRefetching, refetch } = useReportEventsQuery();

  const [gran, setGran] = useState<Granularity>('month');
  const [cursor, setCursor] = useState<Cursor>(() => currentCursor(new Date()));

  const role = data?.role ?? 'expert';
  const isExpert = role === 'expert';

  const report = useMemo(
    () => buildReport(role, data?.events ?? [], gran, cursor),
    [role, data?.events, gran, cursor],
  );

  const now = new Date();
  const atCurrent = isCurrentPeriod(gran, cursor, now);
  const forwardEnabled = canStepForward(gran, cursor, now);

  const granTabs: ZTab[] = GRANULARITIES.map((value) => ({
    id: value,
    label: t(`reports.period.${value}`),
  }));

  const periodLabel = useMemo(() => {
    if (gran === 'year') return `${cursor.year}`;
    if (gran === 'quarter') return `Q${quarterOf(cursor.month) + 1} ${cursor.year}`;
    // First-of-month instant → locale-aware "March 2026" via the shared helper.
    return formatMonthYear(new Date(cursor.year, cursor.month, 1).toISOString());
  }, [gran, cursor]);

  // Per-event duration — mirrors web `eventDuration` (reports-page.component.ts):
  // both kinds use `reports.unit.minute` ("min") so the unit key is consistent
  // across DE/FR; a video shows its m:ss clock prefix, a live coaching shows
  // whole minutes.
  function eventDurationLabel(e: ReportEvent): string {
    const m = t('reports.unit.minute');
    if (e.kind === 'video') {
      return `${videoClock(e.duration_seconds)} ${m}`;
    }
    return `${Math.round(e.duration_seconds / 60)} ${m}`;
  }

  // Meta line via an i18n template with a localized "Video uploaded" /
  // "Live coaching" prefix — no raw concatenation of hardcoded separators.
  function eventMeta(e: ReportEvent): string {
    const prefix = t(e.kind === 'video' ? 'reports.event.videoUploaded' : 'reports.event.liveCoaching');
    const leaf = isExpert ? e.student.name : e.expert.name;
    return t('reports.event.meta', {
      prefix,
      group: e.group.name,
      leaf,
      date: formatDate(e.at),
    });
  }

  let body: React.ReactNode;
  if (isPending) {
    body = <Skeletons />;
  } else if (isError) {
    body = (
      <View className="flex-1 justify-center p-4">
        <ZQueryError
          testID="reports-error-retry"
          title={t('reports.loadFailed')}
          onRetry={() => void refetch()}
        />
      </View>
    );
  } else {
    const flatEvents = report.groups.flatMap((g) => g.leaves.flatMap((l) => l.events));
    body = (
      <FlatList
        data={flatEvents}
        keyExtractor={(e) => `${e.kind}:${e.group.id}:${e.at}`}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        ListHeaderComponent={
          <View className="gap-4">
            {/* Period selector */}
            <ZCard className="gap-3">
              <ZTabs tabs={granTabs} activeId={gran} onChange={(id) => setGran(id as Granularity)} />
              <View className="flex-row items-center justify-between">
                <ZIconButton
                  label={t('reports.period.prev')}
                  onPress={() => setCursor((c) => stepCursor(gran, c, -1))}
                >
                  <ZSymbol name="chevron-left" label={t('reports.period.prev')} size={20} color={colors.muted} />
                </ZIconButton>
                <Text className="text-sm font-semibold text-z-text">{periodLabel}</Text>
                <ZIconButton
                  label={t('reports.period.next')}
                  disabled={!forwardEnabled}
                  onPress={() => setCursor((c) => stepCursor(gran, c, 1))}
                >
                  <ZSymbol name="chevron-right" label={t('reports.period.next')} size={20} color={forwardEnabled ? colors.muted : colors.border} />
                </ZIconButton>
              </View>
              {!atCurrent ? (
                <ZButton
                  label={t('reports.period.today')}
                  variant="ghost"
                  onPress={() => setCursor(currentCursor(new Date()))}
                />
              ) : null}
            </ZCard>

            {/* KPI stat cards — read-only (interactive={false}, no phantom
                onPress) with the web's trailing duration / "in N groups" badge. */}
            <View className="flex-row gap-3">
              <StatCard
                interactive={false}
                testID="reports-stat-videos"
                label={t('reports.stats.videos')}
                count={report.totals.videoCount}
                icon={<ZSymbol name="film" label={t('reports.stats.videos')} size={20} color={colors.primary} />}
                footer={
                  <ZBadge tone="neutral" label={fmtDuration(report.totals.videoSec, t)} />
                }
              />
              <StatCard
                interactive={false}
                testID="reports-stat-live"
                label={t('reports.stats.live')}
                count={report.totals.liveCount}
                icon={<ZSymbol name="video" label={t('reports.stats.live')} size={20} color={colors.success} />}
                footer={
                  <ZBadge tone="success" label={fmtDuration(report.totals.liveSec, t)} />
                }
              />
              <StatCard
                interactive={false}
                testID="reports-stat-people"
                label={isExpert ? t('reports.stats.students') : t('reports.stats.experts')}
                count={report.leafCount}
                icon={
                  isExpert ? (
                    <ZSymbol name="users" label={t('reports.stats.students')} size={20} color={colors.primary} />
                  ) : (
                    <ZSymbol name="person" label={t('reports.stats.experts')} size={20} color={colors.primary} />
                  )
                }
                footer={
                  <ZBadge
                    tone="neutral"
                    label={t('reports.stats.inGroups', { count: report.groupCount })}
                  />
                }
              />
            </View>

            {report.count > 0 ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-z-text">
                  {t('reports.events.sectionTitle')}
                </Text>
                <ZBadge
                  tone="neutral"
                  label={t('reports.period.summary', { count: report.count, period: periodLabel })}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View testID="reports-empty">
            <ZEmptyState
              title={t('reports.empty.title')}
              description={t('reports.empty.description', { period: periodLabel })}
            />
          </View>
        }
        renderItem={({ item }) => (
          <ZCard className="flex-row items-center gap-3">
            <ZIconTile
              size="sm"
              tone={item.kind === 'video' ? 'neutral' : 'success'}
              icon={
                item.kind === 'video' ? (
                  <ZSymbol name="film" label={t('reports.event.videoUploaded')} size={18} color={colors.primary} />
                ) : (
                  <ZSymbol name="video" label={t('reports.event.liveCoaching')} size={18} color={colors.success} />
                )
              }
            />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-semibold text-z-text">
                {item.title}
              </Text>
              <Text numberOfLines={1} className="text-xs text-z-muted">
                {eventMeta(item)}
              </Text>
            </View>
            <ZBadge tone={item.kind === 'video' ? 'neutral' : 'success'} label={eventDurationLabel(item)} />
          </ZCard>
        )}
      />
    );
  }

  return (
    <ZScreen>
      {/* Native header: title reflects expert vs student role. The subtitle
          (activity count for the period) is omitted from the native title since
          native-stack headers don't have a subtitle slot; it remains visible
          inside the FlatList ListHeaderComponent as a ZBadge. */}
      <Stack.Screen
        options={{ title: t(isExpert ? 'reports.expert.title' : 'reports.student.title') }}
      />
      {body}
    </ZScreen>
  );
}
