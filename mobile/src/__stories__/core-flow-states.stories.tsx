import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text, View } from 'react-native';
import { CalendarClock, Video as VideoIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AssetCard } from '../components/asset-card';
import { BookingCard } from '../components/booking-card';
import { GroupCard } from '../components/group-card';
import { ReviewItem } from '../components/review-item';
import { ZEmptyState } from '../components/ui/z-empty-state';
import { ZQueryError } from '../components/ui/z-query-error';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { colors } from '../theme/colors';
import {
  mockAsset,
  mockAssetProcessing,
  mockBookingPast,
  mockBookingUpcoming,
  mockGroup,
  mockGroupLong,
  mockReview,
} from '../components/__stories__/fixtures';

/**
 * Page-state catalog — the mobile counterpart of the web dashboard's
 * `Pages/Core Flow States` story (web/dashboard-next/src/app/pages/
 * core-flow-states.stories.ts).
 *
 * For each key surface (Groups list, Sessions list, Asset review) it renders
 * the FOUR states Zeta's parity rules require on every query-backed surface, in
 * source order: pending (ZSkeleton — never loading text) / error (ZQueryError +
 * retry) / empty (ZEmptyState) / data (the real composites, fed from the shared
 * fixtures file). It is purely presentational: it composes primitives with
 * explicit props and never mounts a real route screen, so there is no
 * query/router runtime. Every title/description reuses the exact i18n key the
 * matching route screen uses, so the catalog stays in lockstep with the app.
 */

// Inert handlers — the catalog is presentational, so actions are no-ops.
const noop = () => {};
const noopOpen = (_assetId: string) => {};

/** The card frame a list row sits in, reused for the skeleton placeholder. */
function CardSurface({ children }: { children: React.ReactNode }) {
  return <View className="rounded-lg border border-z-border bg-z-surface p-3">{children}</View>;
}

/** A titled surface section holding its four ordered states. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-base font-semibold text-z-text">{title}</Text>
      <View className="gap-5">{children}</View>
    </View>
  );
}

function CoreFlowStates() {
  const { t } = useTranslation();
  // Fixed catalog viewer id so BookingCard resolves a stable counterpart.
  const viewerId = 'usr_student_0001';

  return (
    <View className="gap-10">
      {/* ── Groups list — pending / error / empty / data ─────────────────── */}
      <Section title={t('groups.myGroups')}>
        {/* pending */}
        <CardSurface>
          <ZSkeleton className="h-16 w-full" />
        </CardSurface>
        {/* error */}
        <ZQueryError title={t('groups.phase4.loadFailed')} onRetry={noop} />
        {/* empty */}
        <ZEmptyState
          title={t('groups.noGroupsYet')}
          description={t('groups.createFirstDescription')}
        />
        {/* data */}
        <View className="gap-3">
          <GroupCard group={mockGroup} onPress={noop} />
          <GroupCard group={mockGroupLong} onPress={noop} />
        </View>
      </Section>

      {/* ── Sessions list — pending / error / empty / data ───────────────── */}
      <Section title={t('sessions.title')}>
        {/* pending */}
        <CardSurface>
          <ZSkeleton className="h-24 w-full" />
        </CardSurface>
        {/* error */}
        <ZQueryError title={t('sessions.loadFailed')} onRetry={noop} />
        {/* empty */}
        <ZEmptyState
          title={t('sessions.empty.upcomingHeading')}
          description={t('sessions.empty.upcomingDescription')}
          icon={<CalendarClock color={colors.primary} size={24} />}
        />
        {/* data */}
        <View className="gap-3">
          <BookingCard
            booking={mockBookingUpcoming}
            currentUserId={viewerId}
            canCancel
            onCancel={noop}
            onOpenRecording={noopOpen}
            onJoin={noop}
          />
          <BookingCard
            booking={mockBookingPast}
            currentUserId={viewerId}
            canCancel={false}
            onCancel={noop}
            onOpenRecording={noopOpen}
          />
        </View>
      </Section>

      {/* ── Asset review — pending / error / empty / data ────────────────── */}
      <Section title={t('videos.allMyVideos')}>
        {/* pending */}
        <CardSurface>
          <ZSkeleton className="h-20 w-full" />
        </CardSurface>
        {/* error */}
        <ZQueryError
          title={t('videos.phase4.loadFailed')}
          description={t('videos.phase4.summary')}
          onRetry={noop}
        />
        {/* empty — the review thread's own empty state */}
        <ZEmptyState
          title={t('videos.noComments')}
          description={t('videos.leaveComment')}
          icon={<VideoIcon color={colors.primary} size={24} />}
        />
        {/* data — asset rows + one resolved review thread item */}
        <View className="gap-3">
          <AssetCard asset={mockAsset} onPress={noop} />
          <AssetCard asset={mockAssetProcessing} onPress={noop} />
          <CardSurface>
            <ReviewItem review={mockReview} />
          </CardSurface>
        </View>
      </Section>
    </View>
  );
}

const meta = {
  title: 'Pages/Core Flow States',
  component: CoreFlowStates,
} satisfies Meta<typeof CoreFlowStates>;
export default meta;

type Story = StoryObj<typeof meta>;

export const CoreStates: Story = {};
