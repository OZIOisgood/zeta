import { Text, View } from 'react-native';
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
import { useRoleColors } from '../theme/native';
import { ZButton } from './ui/z-button';
import { ZIconTile, type ZIconTileTone } from './ui/z-icon-tile';
import { ZListItem } from './ui/z-list-item';

/**
 * SHARED domain component — one notification list row. Mobile counterpart of the
 * web notification-list row
 * (web/dashboard-next/src/app/features/notifications/notification-list.component.ts):
 * a per-type ZIconTile, the localized message, a relative timestamp, an unread
 * dot, and inline accept/decline for actionable group invitations. Flagged SHARED
 * because the bell dropdown / any future inbox surface reuses the same row.
 *
 * Layout: the message row is a `ZListItem` (leading icon-tile · title message ·
 * subtitle timestamp · trailing unread dot · onPress = onOpen). The invite
 * accept/decline buttons (and the resolved/expired status line) render as a
 * FOOTER below the ZListItem, wrapped together with it in the container `View`,
 * so the footer controls live OUTSIDE the row's pressable — no nested-button a11y
 * trap. The screen owns mark-read + navigation + the invite mutations; this
 * component is presentational.
 */

// Per-type icon glyph + ZIconTile tone (WP-UI0 tone→z-token map — never raw
// bg-green-50/amber-50 or text-white).
const ICON_TONE: Record<NotificationIcon, ZIconTileTone> = {
  member: 'success',
  review: 'success',
  booking: 'warning',
  // Web uses the default case (bg-z-surface-warm / text-z-primary-strong) for
  // both upload and invite — align to 'neutral' tone (see notification-list.component.ts
  // iconClasses: default → bg-[var(--z-surface-warm)] text-[var(--z-primary-strong)]).
  upload: 'neutral',
  invite: 'neutral',
};

// ZIconTile maps tone→foreground; pass the matching glyph ROLE so the lucide
// stroke matches the tile's foreground token per scheme. For neutral tiles the
// web uses --z-primary-strong (not --z-primary), so we follow suit. Role names
// (not resolved hexes) at module scope — the hex is resolved per render inside
// TypeGlyph so dark mode flips it.
const ICON_ROLE: Record<NotificationIcon, 'success' | 'warning' | 'accentStrong'> = {
  member: 'success',
  review: 'success',
  booking: 'warning',
  upload: 'accentStrong',
  invite: 'accentStrong',
};

function TypeGlyph({ icon }: { icon: NotificationIcon }) {
  const { color } = useRoleColors();
  const glyphColor = color(ICON_ROLE[icon]);
  switch (icon) {
    case 'member':
      return <UserRound color={glyphColor} size={18} />;
    case 'review':
      return <CircleCheck color={glyphColor} size={18} />;
    case 'upload':
      return <FileVideo color={glyphColor} size={18} />;
    case 'booking':
      return <CalendarDays color={glyphColor} size={18} />;
    default:
      return <Users color={glyphColor} size={18} />;
  }
}

export function NotificationRow({
  item,
  onOpen,
  onAccept,
  onDecline,
  inviteBusy = false,
}: {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
  onAccept: (item: NotificationItem) => void;
  onDecline: (item: NotificationItem) => void;
  /** True while an accept/decline mutation is in flight — disables both
   *  buttons so a double-tap can't fire the mutation twice (the second call
   *  fails and raises a misleading error toast). */
  inviteBusy?: boolean;
}) {
  const { t } = useTranslation();
  const { color } = useRoleColors();
  const view = presentNotification(item);
  const unread = !item.read;
  const resolved = resolvedInvite(item);
  const expired = item.type === 'group_invitation_received' && item.invite_status === 'expired';

  // Footer = invite actions OR a resolved/expired status line. Rendered BELOW the
  // ZListItem (outside its pressable) so the action buttons never nest inside the
  // row's button — keeps the a11y tree flat (row button + sibling buttons).
  let footer: React.ReactNode = null;
  if (showInviteActions(item)) {
    footer = (
      <View className="mt-2 flex-row gap-2">
        <ZButton
          testID={`notification-accept-${item.id}`}
          label={t('notifications.invite.accept')}
          disabled={inviteBusy}
          onPress={() => onAccept(item)}
        />
        <ZButton
          testID={`notification-decline-${item.id}`}
          variant="secondary"
          label={t('notifications.invite.decline')}
          disabled={inviteBusy}
          onPress={() => onDecline(item)}
        />
      </View>
    );
  } else if (resolved === 'accepted') {
    footer = (
      <View className="mt-2 flex-row items-center gap-1.5">
        <Check color={color('success')} size={14} />
        <Text className="text-xs font-semibold text-z-success">
          {t('notifications.invite.accepted', { group: item.payload.group_name })}
        </Text>
      </View>
    );
  } else if (resolved === 'declined') {
    footer = (
      <View className="mt-2 flex-row items-center gap-1.5">
        <X color={color('onSurfaceVariant')} size={14} />
        <Text className="text-xs font-semibold text-z-muted">
          {t('notifications.invite.declined')}
        </Text>
      </View>
    );
  } else if (expired) {
    footer = (
      <Text className="mt-2 text-xs font-semibold text-z-muted">
        {t('notifications.invite.expired')}
      </Text>
    );
  }

  // The whole card carries the unread tonal surface; the message row (ZListItem)
  // stays transparent so the container fill shows through. Unread reads as a
  // filled warm surface-1 tile; read drops the fill entirely (bg-transparent) so
  // it sits as a plain row on the page background — restoring the unread vs read
  // affordance (an earlier change set both to the same fill).
  return (
    <View
      className={`overflow-hidden rounded-[16px] p-3 ${
        unread ? 'bg-surface' : 'bg-transparent'
      }`}
    >
      <ZListItem
        testID={`notification-row-${item.id}`}
        onPress={() => onOpen(item)}
        className="bg-transparent"
        leading={
          <ZIconTile
            tone={ICON_TONE[view.icon]}
            size="md"
            icon={<TypeGlyph icon={view.icon} />}
          />
        }
        title={t(view.messageKey, view.params)}
        // The title IS the notification message — at one line every row
        // truncated ("… booked a session wit…"); two lines carry the sentence.
        titleNumberOfLines={2}
        subtitle={formatRelativeTime(item.created_at, t)}
        trailing={
          unread ? (
            <View
              testID="notification-unread-dot"
              accessibilityLabel={t('notifications.unread')}
              className="h-2 w-2 rounded-full bg-z-primary"
            />
          ) : undefined
        }
      />
      {footer ? <View className="px-3 pb-2">{footer}</View> : null}
    </View>
  );
}
