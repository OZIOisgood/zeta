import { useEffect } from 'react';
import { FlatList, Platform, RefreshControl, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useGroupsQuery } from '../../../api/queries/groups';
import { useNotificationsQuery } from '../../../api/queries/notifications';
import { useAuth } from '../../../auth/auth-store';
import { GroupCard } from '../../../components/group-card';
import { NotificationBell } from '../../../components/notification-bell';
import { useHeaderScrollEdge } from '../../../lib/use-header-scroll-edge';
import { Touchable } from '../../../components/ui/touchable';
import { ZEmptyState } from '../../../components/ui/z-empty-state';
import { ZFab } from '../../../components/ui/z-fab';
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
  const notifications = useNotificationsQuery();
  const unreadCount = notifications.data?.unread_count ?? 0;
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const canSeeGroups = permissions !== null && permissions.includes('groups:read');
  const canCreate = permissions !== null && permissions.includes('groups:create');
  // M3 scroll-edge: flat header at rest, elevated once the list scrolls under it
  // (Android only; iOS large-title header owns its native hairline).
  const onHeaderScroll = useHeaderScrollEdge();

  // Header-right actions (mirror the handoff TopBar):
  //  - The notification bell is present on EVERY tab screen, both platforms, so
  //    headerRight is unconditional.
  //  - iOS additionally surfaces the role-dependent primary action before the
  //    bell (iOS has no FAB):
  //      Creator (groups:create) → "+" to create a group.
  //      Student (no groups:create) → QR-code icon to join a group.
  //    Android surfaces that same action via the Material FAB (rendered in JSX
  //    below), so on Android only the bell sits in the header.
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {Platform.OS === 'ios' ? (
            canCreate ? (
              <Touchable
                testID="groups-create-header-btn"
                accessibilityLabel={t('groups.create')}
                onPress={() => router.push('/group/create')}
                haptic
              >
                <ZSymbol name="plus" label={t('common.actions.add')} size={24} color={colors.primary} />
              </Touchable>
            ) : (
              <Touchable
                testID="groups-join-header-btn"
                accessibilityLabel={t('groups.invitationDialog.joinGroup')}
                onPress={() => router.push('/invite')}
                haptic
              >
                <ZSymbol name="qr-code" label={t('common.actions.join')} size={24} color={colors.primary} />
              </Touchable>
            )
          ) : null}
          <NotificationBell unreadCount={unreadCount} onPress={() => router.push('/notifications')} />
        </View>
      ),
    });
  }, [navigation, canCreate, unreadCount, t, router]);

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
  } else {
    // Empty renders INSIDE the FlatList (ListEmptyComponent + flexGrow) so
    // pull-to-refresh keeps working in exactly the state where users check
    // whether an invitation/group has arrived.
    content = (
      <View className="flex-1 bg-z-bg">
        <FlatList
          data={data ?? []}
          keyExtractor={(g) => g.id}
          onScroll={onHeaderScroll}
          scrollEventThrottle={16}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 16 + (Platform.OS === 'android' ? insets.bottom + ANDROID_TAB_BAR_HEIGHT : 0),
            flexGrow: 1,
          }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          ListEmptyComponent={
            <View testID="groups-empty" className="flex-1 justify-center">
              <ZEmptyState
                title={t('groups.noGroupsYet')}
                description={t(canCreate ? 'groups.createFirstDescription' : 'groups.noGroupsJoined')}
                icon={<ZSymbol name="users" label={t('groups.myGroups')} size={24} color={colors.primary} />}
              />
            </View>
          }
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
      {/* Android only: extended Material FAB for the role-dependent primary
          action (icon + label, hugging its content bottom-right; mutually
          exclusive per user). iOS: the same action is a native header-right
          button (set via useEffect above per mobile/AGENTS.md SOTA-as-default).
          Creator (groups:create) → "Create Group" FAB.
          Student → "Join Group" QR FAB. */}
      {Platform.OS === 'android' ? (
        canCreate ? (
          <ZFab
            testID="groups-create-fab"
            label={t('groups.create')}
            icon={<ZSymbol name="plus" label={t('common.actions.add')} size={24} color={colors.onPrimary} />}
            onPress={() => router.push('/group/create')}
            className="absolute right-6"
            style={{ bottom: insets.bottom + ANDROID_TAB_BAR_HEIGHT + 16 }}
          />
        ) : (
          <ZFab
            testID="groups-join-fab"
            label={t('groups.invitationDialog.joinGroup')}
            icon={<ZSymbol name="qr-code" label={t('common.actions.join')} size={24} color={colors.onPrimary} />}
            onPress={() => router.push('/invite')}
            className="absolute right-6"
            style={{ bottom: insets.bottom + ANDROID_TAB_BAR_HEIGHT + 16 }}
          />
        )
      ) : null}
    </ZScreen>
  );
}
