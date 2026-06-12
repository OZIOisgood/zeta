import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  useGroupQuery,
  useGroupStudentsQuery,
  useGroupExpertsQuery,
  useLeaveGroupMutation,
} from '../../api/queries/groups';
import { useAuth } from '../../auth/auth-store';
import { MemberRow } from '../../components/member-row';
import { ZButton } from '../../components/ui/z-button';
import { ZIconButton } from '../../components/ui/z-icon-button';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { colors } from '../../theme/colors';

function MembersSkeleton() {
  return (
    <View className="gap-3">
      <ZSkeleton className="h-14 w-full" />
      <ZSkeleton className="h-14 w-full" />
    </View>
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

  const { data: experts, isPending: expertsLoading } = useGroupExpertsQuery(
    id ?? '',
    canSeeExperts,
  );
  const { data: students, isPending: studentsLoading } = useGroupStudentsQuery(
    id ?? '',
    canSeeStudents,
  );

  const { mutateAsync, isPending: leaving } = useLeaveGroupMutation(id ?? '');

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  async function handleConfirmLeave() {
    setLeaveError(null);
    try {
      await mutateAsync();
      router.back();
    } catch {
      setLeaveError('Failed to leave group. Please try again.');
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
      <ZScreen className="items-center justify-center gap-4 px-8">
        <Text className="text-center text-z-muted">{t('groups.phase4.detailFailed')}</Text>
        <ZButton label={t('upload.retry')} variant="secondary" onPress={() => void refetch()} />
        <ZButton label={t('common.actions.back')} variant="ghost" onPress={() => router.back()} />
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
          <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-z-surface-warm">
            <Users color={colors.primary} size={28} />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-semibold text-z-text" numberOfLines={2}>
              {data.name}
            </Text>
          </View>
        </View>

        {data.description ? (
          <View className="px-4 pb-4">
            <Text className="text-sm text-z-muted">{data.description}</Text>
          </View>
        ) : null}

        <View className="gap-6 px-4">
          {/* Experts section */}
          {canSeeExperts && (
            <View className="gap-3">
              <Text className="text-base font-semibold text-z-text">{t('groups.experts')}</Text>
              {expertsLoading ? (
                <MembersSkeleton />
              ) : experts && experts.length > 0 ? (
                <View className="divide-y divide-z-border">
                  {experts.map((e) => (
                    <MemberRow key={e.id} member={e} />
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-z-muted">{t('groups.noExperts')}</Text>
              )}
            </View>
          )}

          {/* Students section */}
          {canSeeStudents && (
            <View className="gap-3">
              <Text className="text-base font-semibold text-z-text">{t('groups.students')}</Text>
              {studentsLoading ? (
                <MembersSkeleton />
              ) : students && students.length > 0 ? (
                <View className="divide-y divide-z-border">
                  {students.map((s) => (
                    <MemberRow key={s.id} member={s} />
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-z-muted">{t('groups.noStudents')}</Text>
              )}
            </View>
          )}

          {/* Danger zone */}
          {canLeave && (
            <View className="gap-3 pt-4">
              {!showLeaveConfirm ? (
                <ZButton
                  testID="group-leave"
                  label={t('groups.leave.action')}
                  variant="danger"
                  onPress={() => setShowLeaveConfirm(true)}
                />
              ) : (
                <View className="gap-2">
                  <Text className="text-sm text-z-muted">{t('groups.leave.summary')}</Text>
                  <ZButton
                    testID="group-leave-confirm"
                    label={t('groups.leave.action')}
                    variant="danger"
                    disabled={leaving}
                    onPress={() => void handleConfirmLeave()}
                  />
                  <ZButton
                    label={t('common.actions.cancel')}
                    variant="ghost"
                    onPress={() => {
                      setShowLeaveConfirm(false);
                      setLeaveError(null);
                    }}
                  />
                </View>
              )}
              {leaveError ? (
                <Text className="text-sm text-z-danger">{leaveError}</Text>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </ZScreen>
  );
}
