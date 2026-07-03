import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTabScreenOptions } from '../../../lib/tab-screen-options';

/**
 * Per-tab Stack for the Profile / Preferences tab.
 *
 * Gives the Preferences screen a native-stack large-title header instead of
 * the custom ZPageHeader component. The NativeTabs trigger for this tab uses
 * name="profile" which maps to this folder segment.
 */
export default function ProfileTabLayout() {
  const { t } = useTranslation();
  const tabScreenOptions = useTabScreenOptions();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ ...tabScreenOptions, title: t('preferences.title') }} />
    </Stack>
  );
}
