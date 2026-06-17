import type { ReactNode } from 'react';
import { useState } from 'react';
import { RefreshControl, SectionList, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ZSymbol } from '../components/ui/z-symbol';
import { useTranslation } from 'react-i18next';
import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  type NotificationItem,
} from '../api/queries/notifications';
import {
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '../api/queries/invitations';
import { NotificationRow } from '../components/notification-row';
import { Touchable } from '../components/ui/touchable';
import { ZEmptyState } from '../components/ui/z-empty-state';
import { ZQueryError } from '../components/ui/z-query-error';
import { ZScreen } from '../components/ui/z-screen';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZTabs, type ZTab } from '../components/ui/z-tabs';
import { showToast } from '../components/ui/z-toast';
import { groupByDay } from '../lib/notification-groups';
import { presentNotification, resolvedInvite } from '../lib/notification-presenter';
import { colors } from '../theme/colors';

type NotificationFilter = 'all' | 'unread';

function ListSkeleton() {
  return (
    <View testID="notifications-skeleton" className="gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="flex-row gap-3 rounded-lg border border-z-border bg-z-surface p-3">
          <ZSkeleton className="h-9 w-9 rounded-md" />
          <View className="flex-1 justify-center gap-2">
            <ZSkeleton className="h-3.5 w-4/5" />
            <ZSkeleton className="h-3 w-1/3" />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isPending, isError, refetch, isRefetching } = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();
  const accept = useAcceptInvitationMutation();
  const decline = useDeclineInvitationMutation();

  const [filter, setFilter] = useState<NotificationFilter>('all');

  const items = data?.items ?? [];
  const unreadCount = data?.unread_count ?? 0;

  // Mirror the web filter: unread = not read and not declined (so a declined
  // invite doesn't linger in the unread tab). Uses server invite_status because
  // mobile has no client-side inviteState optimistic field.
  const filteredItems =
    filter === 'unread'
      ? items.filter((item) => !item.read && resolvedInvite(item) !== 'declined')
      : items;

  const sections = groupByDay(filteredItems);

  const tabs: ZTab[] = [
    { id: 'all', label: t('notifications.page.tabs.all'), count: items.length },
    { id: 'unread', label: t('notifications.page.tabs.unread'), count: unreadCount },
  ];

  function onOpen(item: NotificationItem) {
    if (!item.read) markRead.mutate({ id: item.id });
    router.push(presentNotification(item).href as never);
  }

  async function onAccept(item: NotificationItem) {
    const code = item.payload.code;
    if (!code) return;
    try {
      await accept.mutateAsync({ code });
      if (!item.read) {
        await markRead.mutateAsync({ id: item.id });
      } else {
        // markRead already invalidates when the item is unread; for already-read
        // items we must refetch manually so the invite_status update is visible.
        void refetch();
      }
    } catch {
      showToast(t('notifications.invite.errorTitle'), t('notifications.invite.acceptError'), 'error');
    }
  }

  async function onDecline(item: NotificationItem) {
    const code = item.payload.code;
    if (!code) return;
    try {
      await decline.mutateAsync({ code });
      if (!item.read) {
        await markRead.mutateAsync({ id: item.id });
      } else {
        void refetch();
      }
    } catch {
      showToast(t('notifications.invite.errorTitle'), t('notifications.invite.declineError'), 'error');
    }
  }

  // Empty-state copy depends on whether we are in the unread tab or showing all.
  const emptyTitle = filter === 'unread' ? t('notifications.page.allRead') : t('notifications.empty');
  const emptyDescription =
    filter === 'unread' ? t('notifications.emptyDescription') : t('notifications.page.emptyDescription');

  let content: ReactNode;
  if (isPending) {
    content = <ListSkeleton />;
  } else if (isError) {
    content = (
      <View className="flex-1 justify-center p-4">
        <ZQueryError
          title={t('notifications.loadFailed')}
          onRetry={() => void refetch()}
          testID="notifications-error-retry"
        />
      </View>
    );
  } else if (filteredItems.length === 0) {
    content = (
      <View testID="notifications-empty" className="flex-1 justify-center p-4">
        <ZEmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={<ZSymbol name="bell" label={t('notifications.title')} size={24} color={colors.primary} />}
        />
      </View>
    );
  } else {
    content = (
      <SectionList
        sections={sections}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching ?? false} onRefresh={() => void refetch()} />
        }
        renderSectionHeader={({ section }) => (
          <Text className="pb-1 pt-2 text-xs font-extrabold uppercase tracking-[0.06em] text-z-muted">
            {t(section.titleKey)}
          </Text>
        )}
        renderItem={({ item }) => (
          <NotificationRow item={item} onOpen={onOpen} onAccept={onAccept} onDecline={onDecline} />
        )}
      />
    );
  }

  return (
    <ZScreen edges={['bottom']}>
      {/* Native header: title always set; headerRight shows "mark all read"
          only when there are unread items. The TouchableOpacity wrapper is
          kept minimal (native-tier: no ZIconButton which adds extra padding
          inappropriate in a nav-bar context). */}
      <Stack.Screen
        options={{
          title: t('notifications.title'),
          headerRight: unreadCount > 0
            ? () => (
                <Touchable
                  testID="notifications-mark-all"
                  accessibilityLabel={t('notifications.markAllRead')}
                  onPress={() => markAll.mutate()}
                  style={{ marginRight: 4 }}
                  haptic
                >
                  <ZSymbol
                    name="check-all"
                    label={t('notifications.markAllRead')}
                    size={22}
                    color={colors.primary}
                  />
                </Touchable>
              )
            : undefined,
        }}
      />
      {!isPending && !isError ? (
        <ZTabs
          testID="notifications-tabs"
          tabs={tabs}
          activeId={filter}
          onChange={(id) => setFilter(id as NotificationFilter)}
        />
      ) : null}
      {content}
    </ZScreen>
  );
}
