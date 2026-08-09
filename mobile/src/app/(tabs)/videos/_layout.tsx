import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTabScreenOptions } from '../../../lib/tab-screen-options';

/**
 * Per-tab Stack for the Videos tab.
 *
 * Gives the Videos screen a native-stack large-title header instead of the
 * custom ZPageHeader component. The NativeTabs trigger for this tab uses
 * name="videos" which maps to this folder segment.
 */
export default function VideosTabLayout() {
  const { t } = useTranslation();
  const tabScreenOptions = useTabScreenOptions();
  return (
    <Stack>
      {/* "Videos", not "All my videos": the list is group-scoped (an expert and
          a student see the same rows), so the possessive title lied for at
          least one role. */}
      <Stack.Screen name="index" options={{ ...tabScreenOptions, title: t('videos.title') }} />
    </Stack>
  );
}
