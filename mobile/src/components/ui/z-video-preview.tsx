import { Image, View } from 'react-native';
import { Video } from 'lucide-react-native';
import { useRoleColors } from '../../theme/native';

/**
 * Video thumbnail/preview. Mobile counterpart of the web `z-video-preview`
 * wrapper (web/dashboard-next/src/app/shared/ui/video-preview/).
 * Renders the Mux thumbnail when present, otherwise a centered fallback icon.
 *
 * The fallback icon color uses `useRoleColors` so it adapts to dark mode
 * (light: onSurfaceVariant #735f4d → dark: onSurfaceVariant #a8917c).
 */
export function ZVideoPreview({
  thumbnail,
  alt,
  testID,
}: {
  thumbnail?: string;
  alt?: string;
  testID?: string;
}) {
  const { color } = useRoleColors();

  return (
    <View
      testID={testID}
      className="aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-z-surface-muted"
    >
      {thumbnail ? (
        <Image
          source={{ uri: thumbnail }}
          accessibilityLabel={alt}
          resizeMode="cover"
          className="h-full w-full"
        />
      ) : (
        <Video color={color('onSurfaceVariant')} size={24} />
      )}
    </View>
  );
}
