import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useGroupsQuery } from '../../../api/queries/groups';
import { useAuth } from '../../../auth/auth-store';
import { GroupCard } from '../../../components/group-card';
import { ZButton } from '../../../components/ui/z-button';
import { ZEmptyState } from '../../../components/ui/z-empty-state';
import { ZIconButton } from '../../../components/ui/z-icon-button';
import { ZQueryError } from '../../../components/ui/z-query-error';
import { ZScreen } from '../../../components/ui/z-screen';
import { ZSkeleton } from '../../../components/ui/z-skeleton';
import { ZSymbol } from '../../../components/ui/z-symbol';
import { colors } from '../../../theme/colors';

function ListSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          testID="group-skeleton"
          className="flex-row gap-3 rounded-lg border border-z-border bg-z-surface p-3"
        >
          <ZSkeleton className="h-12 w-12 rounded-md" />
          <View className="flex-1 justify-center gap-2">
            <ZSkeleton className="h-4 w-3/5" />
            <ZSkeleton className="h-3 w-2/5" />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function GroupsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isPending, isError, refetch, isRefetching } = useGroupsQuery();
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const canCreate = permissions !== null && permissions.includes('groups:create');

  let content: React.ReactNode;

  if (isPending) {
    content = (
      <View className="flex-1 bg-z-bg">
        <ListSkeleton />
      </View>
    );
  } else if (isError) {
    content = (
      <View className="flex-1 justify-center bg-z-bg p-4">
        <ZQueryError title={t('groups.phase4.loadFailed')} onRetry={() => void refetch()} />
      </View>
    );
  } else if (!data || data.length === 0) {
    content = (
      <View testID="groups-empty" className="flex-1 justify-center bg-z-bg p-4">
        <ZEmptyState
          title={t('groups.noGroupsYet')}
          description={t(canCreate ? 'groups.createFirstDescription' : 'groups.noGroupsJoined')}
          icon={<ZSymbol name="users" label={t('groups.myGroups')} size={24} color={colors.primary} />}
        />
      </View>
    );
  } else {
    content = (
      <View className="flex-1 bg-z-bg">
        <FlatList
          data={data}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          renderItem={({ item }) => (
            <GroupCard group={item} onPress={() => router.push(`/group/${item.id}`)} />
          )}
        />
      </View>
    );
  }

  return (
    <ZScreen edges={['top']}>
      {/* The secondary Join action for experts (groups:create) moves to the
          screen body since the native stack header owns the primary title.
          Experts can also join, so a ZButton is provided near the top of
          content; students rely on the Join FAB as their primary action. */}
      {canCreate ? (
        <View className="px-4 pb-2">
          <ZButton
            testID="groups-join"
            label={t('groups.invitationDialog.joinGroup')}
            variant="secondary"
            onPress={() => router.push('/invite')}
            icon={<ZSymbol name="qr-code" label={t('common.actions.join')} size={16} color={colors.text} />}
          />
        </View>
      ) : null}
      {content}
      {canCreate ? (
        <ZIconButton
          testID="groups-create-fab"
          label={t('groups.create')}
          variant="primary"
          size="lg"
          shape="circle"
          onPress={() => router.push('/group/create')}
          className="absolute bottom-6 right-6"
        >
          <ZSymbol name="plus" label={t('common.actions.add')} size={24} color={colors.onPrimary} />
        </ZIconButton>
      ) : (
        <ZIconButton
          testID="groups-join-fab"
          label={t('groups.invitationDialog.joinGroup')}
          variant="primary"
          size="lg"
          shape="circle"
          onPress={() => router.push('/invite')}
          className="absolute bottom-6 right-6"
        >
          <ZSymbol name="qr-code" label={t('common.actions.join')} size={24} color={colors.onPrimary} />
        </ZIconButton>
      )}
    </ZScreen>
  );
}
