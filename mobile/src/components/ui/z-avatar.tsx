import { Image, Text, View } from 'react-native';
import { avatarSrc } from '../../lib/avatar';

/**
 * Group/user avatar. Mobile counterpart of the web `z-avatar`
 * wrapper (web/dashboard-next/src/app/shared/ui/avatar/).
 * Shows the image when present, otherwise the fallback initials.
 */
export type ZAvatarShape = 'rounded' | 'circle';

export function ZAvatar({
  image,
  fallback = '',
  size = 36,
  shape = 'rounded',
  alt,
  testID,
}: {
  image?: string;
  fallback?: string;
  size?: number;
  shape?: ZAvatarShape;
  alt?: string;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={alt}
      className={`items-center justify-center overflow-hidden bg-z-surface-warm ${
        shape === 'circle' ? 'rounded-full' : 'rounded-md'
      }`}
      style={{ width: size, height: size }}
    >
      {image ? (
        <Image source={{ uri: avatarSrc(image) }} style={{ width: size, height: size }} />
      ) : (
        <Text className="text-sm font-semibold text-z-primary">{fallback}</Text>
      )}
    </View>
  );
}
