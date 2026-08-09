import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoleColors } from '../theme/native';
import { Touchable } from './ui/touchable';
import { ZSymbol } from './ui/z-symbol';

/**
 * Shell bell + unread-count badge. The mobile counterpart of the web navbar bell
 * (web/dashboard-next/src/app/core/state/notifications.store badge computed).
 * Lives in a list/index screen header `action` slot (Home). Secondary navigation
 * action — not a FAB.
 *
 * Material-handoff look (design_handoff_home_videos/material-home.jsx TopBar):
 * the bell sits in a 44px tonal `surface-warm` circle with a neutral (onSurface)
 * glyph and an edge-aligned primary badge. Uses ZSymbol (SF Symbols on iOS /
 * Material Symbols on Android) rather than lucide, per the Native-fidelity rules.
 */
export function NotificationBell({
  unreadCount,
  onPress,
}: {
  unreadCount: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { color } = useRoleColors();
  // Mirror the web badge computed: > 9 → '9+', otherwise the exact count string.
  const badge = unreadCount > 9 ? '9+' : String(unreadCount);
  return (
    <Touchable
      testID="notification-bell"
      accessibilityLabel={t('notifications.open')}
      onPress={onPress}
      haptic
      className="h-11 w-11 items-center justify-center rounded-full bg-z-surface-warm"
    >
      <ZSymbol name="bell" label={t('notifications.open')} size={22} color={color('onSurface')} />
      {unreadCount > 0 ? (
        <View
          testID="notification-bell-badge"
          accessibilityLabel={t('notifications.unread')}
          className="absolute right-1 top-1 min-w-[18px] items-center justify-center rounded-full border border-z-surface bg-z-primary px-1"
          pointerEvents="none"
        >
          {/* Badge foreground = the onPrimary token (white-on-color) from
              theme/colors.ts, not a raw `text-white` class. There is no
              `z-on-primary` NativeWind class in tailwind.config.js, so the token
              flows in via `style` (theme/colors.ts is the sanctioned non-class
              color source per mobile/AGENTS.md). */}
          <Text className="text-[10px] font-bold" style={{ color: color('onAccent') }}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Touchable>
  );
}
