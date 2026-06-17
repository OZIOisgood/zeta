/**
 * ZEmptyState — Android implementation (role-token-styled RN View).
 *
 * Android Material 3 has no direct equivalent of iOS ContentUnavailableView.
 * The Material 3 guidance for empty states ("no data illustration") recommends
 * an illustrated column layout, which maps well to the existing NativeWind
 * design. This variant preserves the visual structure but uses role tokens
 * from theme/native.ts instead of NativeWind classes for color resolution,
 * keeping it consistent with the Native tier contract. Per the Material handoff
 * (filled-tonal direction) the container is borderless — the warm screen
 * background gives the `surface` fill enough separation without an outline.
 *
 * The `icon` ReactNode is rendered as-is (lucide icon, ZSymbol, etc.) or
 * replaced by the default Inbox icon. `iconSystemImage` is unused on Android.
 *
 * Material 3 reference: https://m3.material.io/foundations/communication/empty-states
 */

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import { ZSymbol } from './z-symbol';
import type { ZEmptyStateProps } from './z-empty-state.types';

export type { ZEmptyStateProps } from './z-empty-state.types';

export function ZEmptyState({
  title,
  description,
  icon,
  children,
}: ZEmptyStateProps) {
  const { color } = useRoleColors();

  const iconNode: ReactNode = icon ?? <ZSymbol name="inbox" label="" size={24} color={color('accent')} />;

  return (
    <View
      style={{
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: color('surface'),
        paddingHorizontal: 20,
        paddingVertical: 32,
      }}
    >
      <View
        style={{
          height: 48,
          width: 48,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          backgroundColor: color('surfaceVariant'),
        }}
      >
        {iconNode}
      </View>
      <Text
        style={{
          marginTop: 16,
          fontSize: 16,
          // An explicit `style` suppresses the Text.defaultProps Nunito default
          // (React only fills undefined props), and Android can't synthesize the
          // SemiBold cut from a numeric weight — so name the loaded face directly.
          fontFamily: 'NunitoSans_600SemiBold',
          color: color('onSurface'),
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          marginTop: 8,
          fontSize: 14,
          lineHeight: 24,
          fontFamily: 'NunitoSans_400Regular',
          color: color('onSurfaceVariant'),
          textAlign: 'center',
        }}
      >
        {description}
      </Text>
      {children ? <View style={{ marginTop: 20 }}>{children}</View> : null}
    </View>
  );
}
