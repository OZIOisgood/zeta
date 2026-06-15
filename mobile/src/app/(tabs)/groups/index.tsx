import { useEffect } from 'react';
import { FlatList, Platform, RefreshControl, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useGroupsQuery } from '../../../api/queries/groups';
import { useAuth } from '../../../auth/auth-store';
import { GroupCard } from '../../../components/group-card';
import { Touchable } from '../../../components/ui/touchable';
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

// Height of the NativeTabs navigation bar on Android (Material 3 NavigationBar).
// iOS auto-insets via contentInsetAdjustmentBehavior; this constant is Android-only.
const ANDROID_TAB_BAR_HEIGHT = 56;

export default function GroupsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, refetch, isRefetching } = useGroupsQuery();
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const canSeeGroups = permissions !== null && permissions.includes('groups:read');
  const canCreate = permissions !== null && permissions.includes('groups:create');

  // iOS: surface the role-dependent primary action in the native nav-bar header.
  //   Creator (groups:create) → "+" to create a group.
  //   Student (no groups:create) → QR-code icon to join a group.
  // Android: the same action is surfaced as a Material FAB (rendered in JSX below).
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    navigation.setOptions({
      headerRight: canCreate
        ? () => (
            <Touchable
              testID="groups-create-header-btn"
              accessibilityLabel={t('groups.create')}
              onPress={() => router.push('/group/create')}
              haptic
            >
              <ZSymbol name="plus" label={t('common.actions.add')} size={24} color={colors.primary} />
            </Touchable>
          )
        : () => (
            <Touchable
              testID="groups-join-header-btn"
              accessibilityLabel={t('groups.invitationDialog.joinGroup')}
              onPress={() => router.push('/invite')}
              haptic
            >
              <ZSymbol name="qr-code" label={t('common.actions.join')} size={24} color={colors.primary} />
            </Touchable>
          ),
    });
  }, [navigation, canCreate, t, router]);

  // Defensive self-guard: if the user somehow navigates here without the tab
  // permission (e.g. via a deep-link before permissions resolve), render a
  // no-access state rather than firing a 403-ing query.
  // Mirror: availability.tsx canManage gate pattern.
  if (!canSeeGroups) {
    return (
      <ZScreen edges={[]}>
        <View testID="groups-no-permission" className="flex-1 items-center justify-center p-4">
          <ZEmptyState
            title={t('groups.membersUnavailable')}
            description={t('groups.membersUnavailableDescription')}
            icon={<ZSymbol name="users" label={t('groups.membersUnavailable')} size={24} color={colors.primary} />}
          />
        </View>
      </ZScreen>
    );
  }

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
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 16 + (Platform.OS === 'android' ? insets.bottom + ANDROID_TAB_BAR_HEIGHT : 0),
          }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          renderItem={({ item }) => (
            <GroupCard group={item} onPress={() => router.push(`/group/${item.id}`)} />
          )}
        />
      </View>
    );
  }

  return (
    <ZScreen edges={[]}>
      {content}
      {/* Android only: Material FABs for the role-dependent primary action.
          iOS: the same action is a native header-right button (set via
          useEffect above per mobile/AGENTS.md SOTA-as-default).
          Creator (groups:create) → "+" FAB to create a group.
          Student → QR-code FAB to join a group. */}
      {Platform.OS === 'android' ? (
        <View
          className="absolute right-6"
          style={{ bottom: insets.bottom + ANDROID_TAB_BAR_HEIGHT + 16 }}
        >
          {canCreate ? (
            <ZIconButton
              testID="groups-create-fab"
              label={t('groups.create')}
              variant="primary"
              size="lg"
              shape="circle"
              onPress={() => router.push('/group/create')}
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
            >
              <ZSymbol name="qr-code" label={t('common.actions.join')} size={24} color={colors.onPrimary} />
            </ZIconButton>
          )}
        </View>
      ) : null}
    </ZScreen>
  );
}
