import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  Check,
  CircleCheck,
  FileVideo,
  UserRound,
  Users,
  X,
} from 'lucide-react-native';
import type { NotificationItem } from '../api/queries/notifications';
import {
  presentNotification,
  resolvedInvite,
  showInviteActions,
  type NotificationIcon,
} from '../lib/notification-presenter';
import { formatRelativeTime } from '../lib/datetime';
import { colors } from '../theme/colors';
import { ZButton } from './ui/z-button';
import { ZIconTile, type ZIconTileTone } from './ui/z-icon-tile';

/**
 * SHARED domain component — one notification list row. Mobile counterpart of the
 * web notification-list row
 * (web/dashboard-next/src/app/features/notifications/notification-list.component.ts):
 * a per-type ZIconTile, the localized message, a relative timestamp, an unread
 * dot, and inline accept/decline for actionable group invitations. Flagged SHARED
 * because the bell dropdown / any future inbox surface reuses the same row.
 *
 * Pressing the row (anywhere but the action buttons) fires `onOpen`. The screen
 * owns mark-read + navigation + the invite mutations; this component is presentational.
 */

// Per-type icon glyph + ZIconTile tone (WP-UI0 tone→z-token map — never raw
// bg-green-50/amber-50 or text-white).
const ICON_TONE: Record<NotificationIcon, ZIconTileTone> = {
  member: 'success',
  review: 'success',
  booking: 'warning',
  upload: 'primary',
  invite: 'neutral',
};

// ZIconTile maps tone→foreground; pass the matching glyph color so the lucide
// stroke matches the tile's foreground token.
const ICON_COLOR: Record<NotificationIcon, string> = {
  member: colors.success,
  review: colors.success,
  booking: colors.warning,
  upload: colors.primary,
  invite: colors.primary,
};

function TypeGlyph({ icon }: { icon: NotificationIcon }) {
  const color = ICON_COLOR[icon];
  switch (icon) {
    case 'member':
      return <UserRound color={color} size={18} />;
    case 'review':
      return <CircleCheck color={color} size={18} />;
    case 'upload':
      return <FileVideo color={color} size={18} />;
    case 'booking':
      return <CalendarDays color={color} size={18} />;
    default:
      return <Users color={color} size={18} />;
  }
}

export function NotificationRow({
  item,
  onOpen,
  onAccept,
  onDecline,
}: {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
  onAccept: (item: NotificationItem) => void;
  onDecline: (item: NotificationItem) => void;
}) {
  const { t } = useTranslation();
  const view = presentNotification(item);
  const unread = !item.read;
  const resolved = resolvedInvite(item);

  return (
    <Pressable
      testID={`notification-row-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={t(view.messageKey, view.params)}
      onPress={() => onOpen(item)}
      className={`flex-row items-start gap-3 rounded-lg border border-z-border p-3 active:bg-z-surface-warm ${
        unread ? 'bg-z-surface-warm' : 'bg-z-surface'
      }`}
    >
      <ZIconTile
        tone={ICON_TONE[view.icon]}
        size="sm"
        icon={<TypeGlyph icon={view.icon} />}
      />

      <View className="min-w-0 flex-1">
        <Text className="text-sm leading-5 text-z-text">{t(view.messageKey, view.params)}</Text>
        <Text className="mt-0.5 text-xs text-z-muted">{formatRelativeTime(item.created_at, t)}</Text>

        {showInviteActions(item) ? (
          <View className="mt-2 flex-row gap-2">
            <ZButton
              testID={`notification-accept-${item.id}`}
              label={t('notifications.invite.accept')}
              onPress={() => onAccept(item)}
            />
            <ZButton
              testID={`notification-decline-${item.id}`}
              variant="secondary"
              label={t('notifications.invite.decline')}
              onPress={() => onDecline(item)}
            />
          </View>
        ) : resolved === 'accepted' ? (
          <View className="mt-2 flex-row items-center gap-1.5">
            <Check color={colors.success} size={14} />
            <Text className="text-xs font-semibold text-z-success">
              {t('notifications.invite.accepted', { group: item.payload.group_name })}
            </Text>
          </View>
        ) : resolved === 'declined' ? (
          <View className="mt-2 flex-row items-center gap-1.5">
            <X color={colors.muted} size={14} />
            <Text className="text-xs font-semibold text-z-muted">
              {t('notifications.invite.declined')}
            </Text>
          </View>
        ) : item.type === 'group_invitation_received' && item.invite_status === 'expired' ? (
          <Text className="mt-2 text-xs font-semibold text-z-muted">
            {t('notifications.invite.expired')}
          </Text>
        ) : null}
      </View>

      {unread ? (
        <View
          testID="notification-unread-dot"
          accessibilityLabel={t('notifications.unread')}
          className="mt-1.5 h-2 w-2 rounded-full bg-z-primary"
        />
      ) : null}
    </Pressable>
  );
}
