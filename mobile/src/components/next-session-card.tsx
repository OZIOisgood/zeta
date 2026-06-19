import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../api/queries/coaching';
import { formatBookingDateTime, formatRelativeFuture } from '../api/queries/coaching';
import { bookingCounterpart } from './booking-card';
import { colors } from '../theme/colors';
import { useRoleColors } from '../theme/native';
import { Touchable } from './ui/touchable';
import { ZButton } from './ui/z-button';
import { ZSymbol } from './ui/z-symbol';

export type NextSessionCardProps = {
  booking: Booking | null;
  currentUserId: string;
  canBook: boolean;
  canJoin: boolean;
  onJoin: () => void;
  onDetails: () => void;
  onBook: () => void;
};

/**
 * Brand-led tonal hero surface (AGENTS.md Custom-RN tier a). A View — not ZCard —
 * because the handoff fixes radius 28 / padding 18 and the native Compose Card
 * has no corner-radius prop. All interactive children are native primitives.
 */
function HeroSurface({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} className="mx-4 rounded-[28px] bg-accent-container p-[18px]">
      {children}
    </View>
  );
}

export function NextSessionCard({
  booking,
  currentUserId,
  canBook,
  canJoin,
  onJoin,
  onDetails,
  onBook,
}: NextSessionCardProps) {
  const { t, i18n } = useTranslation();
  const { color: roleColor } = useRoleColors();

  if (!booking) {
    if (!canBook) return null;
    return (
      <HeroSurface testID="next-session-card">
        <Text className="text-base font-bold text-on-accent-container">
          {t('home.emptyCoaching.heading')}
        </Text>
        <Text className="mt-1 text-[15px] text-on-accent-container opacity-90">
          {t('home.emptyCoaching.description')}
        </Text>
        <View className="mt-4">
          <ZButton
            testID="next-session-book"
            label={t('common.actions.bookSession')}
            variant="primary"
            icon={<ZSymbol name="calendar-plus" label={t('common.actions.bookSession')} size={18} color={colors.onPrimary} />}
            onPress={onBook}
          />
        </View>
      </HeroSurface>
    );
  }

  const { name: counterpart } = bookingCounterpart(booking, currentUserId);
  const sessionTypeName = booking.session_type_name ?? t('sessions.sessionFallback');
  const relative = formatRelativeFuture(booking.scheduled_at, i18n.language);

  return (
    <HeroSurface testID="next-session-card">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-1.5">
          <ZSymbol name="calendar" label={t('home.nextSession.title')} size={14} color={roleColor('onAccentContainer')} />
          <Text className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-on-accent-container">
            {t('home.nextSession.title')}
          </Text>
        </View>
        <View testID="next-session-when" className="rounded-full bg-surface px-2.5 py-1">
          <Text className="text-xs font-bold text-on-surface">{relative}</Text>
        </View>
      </View>

      <Text numberOfLines={2} className="mt-3 text-[19px] font-extrabold text-on-accent-container">
        {t('home.nextSession.titleWith', { type: sessionTypeName, name: counterpart })}
      </Text>
      <View className="mt-1.5 flex-row items-center gap-1.5">
        <ZSymbol name="clock" label={t('common.status.upcoming')} size={15} color={roleColor('onAccentContainer')} />
        <Text className="text-[15px] font-semibold text-on-accent-container opacity-90">
          {formatBookingDateTime(booking.scheduled_at)} · {booking.duration_minutes} min
        </Text>
      </View>

      <View className="mt-4 flex-row items-center gap-2">
        {canJoin ? (
          <ZButton
            testID="next-session-join"
            label={t('common.actions.join')}
            variant="primary"
            icon={<ZSymbol name="video" label={t('common.actions.join')} size={18} color={colors.onPrimary} />}
            onPress={onJoin}
          />
        ) : null}
        <Touchable
          testID="next-session-details"
          onPress={onDetails}
          haptic
          accessibilityLabel={t('common.actions.details')}
          className="h-10 flex-row items-center justify-center rounded-full border border-on-accent-container px-5"
        >
          <Text className="text-[15px] font-semibold text-on-accent-container">
            {t('common.actions.details')}
          </Text>
        </Touchable>
      </View>
    </HeroSurface>
  );
}
