import { Image, Text, View } from 'react-native';
import { avatarSrc } from '../../lib/avatar';
import type { ZAvatarProps } from './z-avatar.types';

export type { ZAvatarProps, ZAvatarShape, ZAvatarTone } from './z-avatar.types';

/**
 * Group/user avatar. Mobile counterpart of the web `z-avatar`
 * wrapper (web/dashboard-next/src/app/shared/ui/avatar/).
 * Shows the image when present, otherwise the fallback initials.
 */
export function ZAvatar({
  image,
  fallback = '',
  size = 36,
  shape = 'rounded',
  tone = 'default',
  alt,
  testID,
}: ZAvatarProps) {
  const isAccent = tone === 'accent';
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={alt}
      className={`items-center justify-center overflow-hidden ${
        isAccent ? 'bg-accent-container' : 'bg-z-surface-warm'
      } ${shape === 'circle' ? 'rounded-full' : 'rounded-md'}`}
      style={{ width: size, height: size }}
    >
      {image ? (
        <Image source={{ uri: avatarSrc(image) }} style={{ width: size, height: size }} />
      ) : (
        <Text
          className={isAccent ? 'font-extrabold text-on-accent-container' : 'font-semibold text-z-primary'}
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {fallback}
        </Text>
      )}
    </View>
  );
}
