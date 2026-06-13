import { useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck, TriangleAlert, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  useGroupQuery,
  useGroupStudentsQuery,
  useGroupExpertsQuery,
  useLeaveGroupMutation,
  type GroupUser,
} from '../../api/queries/groups';
import { useAuth } from '../../auth/auth-store';
import { MemberRow } from '../../components/member-row';
import { ZAvatar } from '../../components/ui/z-avatar';
import { ZBadge } from '../../components/ui/z-badge';
import { ZButton } from '../../components/ui/z-button';
import { ZCard } from '../../components/ui/z-card';
import { ZConfirmDialog } from '../../components/ui/z-confirm-dialog';
import { ZEmptyState } from '../../components/ui/z-empty-state';
import { ZIconButton } from '../../components/ui/z-icon-button';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { showToast } from '../../components/ui/z-toast';
import { colors } from '../../theme/colors';

/** Avatar fallback initials from a group name; mirrors the web `groupInitials` helper. */
function groupInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || '?'
  );
}

function MembersSkeleton() {
  return (
    <View className="mt-5 gap-3">
      <ZSkeleton className="h-14 w-full" />
      <ZSkeleton className="h-14 w-full" />
    </View>
  );
}

function MemberDivider() {
  return <View className="h-px bg-z-border" />;
}

function MemberSection({
  kind,
  title,
  description,
  members,
  isLoading,
  isError,
  onRetry,
}: {
  kind: 'experts' | 'students';
  title: string;
  description: string;
  members: GroupUser[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const count = members?.length ?? 0;
  const Icon = kind === 'experts' ? ShieldCheck : Users;
  const emptyTitle = kind === 'experts' ? t('groups.noExperts') : t('groups.noStudents');
  const emptyDescription =
    kind === 'experts' ? t('groups.noExpertsDescription') : t('groups.inviteStudents');

  return (
    <ZCard>
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-md bg-z-surface-warm">
          <Icon color={colors.primary} size={20} />
        </View>
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-base font-semibold text-z-text">{title}</Text>
            <ZBadge label={String(count)} tone="neutral" />
          </View>
          <Text className="mt-1 text-sm leading-6 text-z-muted">{description}</Text>
        </View>
      </View>

      {isLoading ? (
        <MembersSkeleton />
      ) : isError ? (
        <View className="mt-5">
          <ZEmptyState
            title={t('groups.membersLoadFailed')}
            description={t('home.error.description')}
            icon={<TriangleAlert color={colors.primary} size={24} />}
          >
            <ZButton
              testID={`members-retry-${kind}`}
              label={t('common.actions.retry')}
              variant="secondary"
              onPress={onRetry}
            />
          </ZEmptyState>
        </View>
      ) : count > 0 ? (
        <View className="mt-5">
          <FlatList
            data={members}
            scrollEnabled={false}
            keyExtractor={(m) => m.id}
            ItemSeparatorComponent={MemberDivider}
            renderItem={({ item }) => <MemberRow member={item} />}
          />
        </View>
      ) : (
        <View className="mt-5">
          <ZEmptyState title={emptyTitle} description={emptyDescription} icon={<Icon color={colors.primary} size={24} />} />
        </View>
      )}
    </ZCard>
  );
}

export default function GroupDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isPending, isError, refetch } = useGroupQuery(id ?? '');

  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const userId = useAuth((s) => s.user?.id ?? null);

  const canSeeExperts = permissions?.includes('groups:expert-list:read') ?? false;
  const canSeeStudents = permissions?.includes('groups:user-list:read') ?? false;
  const canLeave =
    (permissions?.includes('groups:membership:leave') ?? false) &&
    data !== undefined &&
    data.owner_id !== userId;

  const {
    data: experts,
    isPending: expertsLoading,
    isError: expertsError,
    refetch: refetchExperts,
  } = useGroupExpertsQuery(id ?? '', canSeeExperts);
  const {
    data: students,
    isPending: studentsLoading,
    isError: studentsError,
    refetch: refetchStudents,
  } = useGroupStudentsQuery(id ?? '', canSeeStudents);

  const { mutateAsync } = useLeaveGroupMutation(id ?? '');

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  async function handleConfirmLeave() {
    setShowLeaveConfirm(false);
    try {
      await mutateAsync();
      showToast(t('groups.leave.success', { group: data?.name ?? '' }), undefined, 'success');
      router.back();
    } catch {
      showToast(t('groups.leave.failed'), undefined, 'error');
    }
  }

  if (isPending) {
    return (
      <ZScreen className="gap-4 p-4">
        <ZSkeleton testID="group-detail-skeleton" className="h-20 w-full" />
        <ZSkeleton className="h-5 w-3/5" />
        <ZSkeleton className="h-4 w-4/5" />
      </ZScreen>
    );
  }

  if (isError || !data) {
    return (
      <ZScreen className="items-center justify-center px-8">
        <ZEmptyState
          title={t('groups.phase4.detailFailed')}
          description={t('home.error.description')}
          icon={<TriangleAlert color={colors.primary} size={24} />}
        >
          <View className="gap-2">
            <ZButton
              label={t('common.actions.retry')}
              variant="secondary"
              onPress={() => void refetch()}
            />
            <ZButton
              label={t('common.actions.back')}
              variant="ghost"
              onPress={() => router.back()}
            />
          </View>
        </ZEmptyState>
      </ZScreen>
    );
  }

  return (
    <ZScreen edges={['bottom']}>
      <ScrollView className="flex-1 bg-z-bg" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View className="flex-row items-center gap-3 p-4">
          <ZIconButton label={t('common.actions.back')} onPress={() => router.back()}>
            <ArrowLeft color={colors.text} size={22} />
          </ZIconButton>
          <ZAvatar
            image={data.avatar ?? undefined}
            fallback={groupInitials(data.name)}
            alt={data.name}
            size={56}
          />
          <View className="flex-1">
            <Text className="text-xl font-semibold text-z-text" numberOfLines={2}>
              {data.name}
            </Text>
          </View>
        </View>

        <View className="px-4 pb-4">
          <Text className="text-sm text-z-muted">
            {data.description || t('groups.phase4.noDescription')}
          </Text>
        </View>

        <View className="gap-6 px-4">
          {/* Member sections */}
          {canSeeExperts || canSeeStudents ? (
            <View className="gap-4">
              {canSeeExperts && (
                <MemberSection
                  kind="experts"
                  title={t('groups.experts')}
                  description={t('groups.expertsDescription')}
                  members={experts}
                  isLoading={expertsLoading}
                  isError={expertsError}
                  onRetry={() => void refetchExperts()}
                />
              )}
              {canSeeStudents && (
                <MemberSection
                  kind="students"
                  title={t('groups.students')}
                  description={t('groups.studentsDescription')}
                  members={students}
                  isLoading={studentsLoading}
                  isError={studentsError}
                  onRetry={() => void refetchStudents()}
                />
              )}
            </View>
          ) : (
            <ZEmptyState
              title={t('groups.membersUnavailable')}
              description={t('groups.membersUnavailableDescription')}
              icon={<TriangleAlert color={colors.primary} size={24} />}
            />
          )}

          {/* Danger zone */}
          {canLeave && (
            <View className="pt-4">
              <ZButton
                testID="group-leave"
                label={t('groups.leave.action')}
                variant="danger"
                onPress={() => setShowLeaveConfirm(true)}
              />
              <ZConfirmDialog
                testID="group-leave-dialog"
                visible={showLeaveConfirm}
                tone="danger"
                title={t('groups.leave.title')}
                description={t('groups.leave.confirm', { group: data.name })}
                confirmLabel={t('groups.leave.action')}
                cancelLabel={t('common.actions.cancel')}
                onConfirm={() => void handleConfirmLeave()}
                onCancel={() => setShowLeaveConfirm(false)}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </ZScreen>
  );
}
