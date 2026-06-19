import { Text, View } from 'react-native';
import { ZButton } from './z-button';
import type { ZBookingBarProps } from './z-booking-bar.types';

export type { ZBookingBarProps } from './z-booking-bar.types';

/**
 * Fixed footer bar with a running summary on the left and the single CTA on the
 * right. 1px outline top edge; background fills so scrolled content does not
 * show through. Bottom padding accounts for the home indicator (ZScreen's
 * `edges={['bottom']}` already applies the safe-area inset on the parent).
 */
export function ZBookingBar({
  headline,
  hint,
  context,
  ctaLabel,
  ctaDisabled,
  ctaLoading,
  onPress,
  testID,
}: ZBookingBarProps) {
  return (
    <View
      testID={testID}
      className="flex-row items-center gap-3 border-t border-outline bg-background px-4 pb-4 pt-3"
    >
      <View className="flex-1">
        {headline ? (
          <>
            <Text className="text-[17px] font-extrabold text-on-surface">{headline}</Text>
            {context ? (
              <Text numberOfLines={1} className="text-xs text-on-surface-variant">
                {context}
              </Text>
            ) : null}
          </>
        ) : (
          <Text className="text-sm text-on-surface-variant">{hint}</Text>
        )}
      </View>
      <ZButton
        testID={testID ? `${testID}-cta` : undefined}
        label={ctaLabel}
        disabled={ctaDisabled}
        loading={ctaLoading}
        onPress={onPress}
      />
    </View>
  );
}
