import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Per-tab Stack for the Videos tab.
 *
 * Gives the Videos screen a native-stack large-title header instead of the
 * custom ZPageHeader component. The NativeTabs trigger for this tab uses
 * name="videos" which maps to this folder segment.
 */
export default function VideosTabLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t('videos.allMyVideos'),
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
