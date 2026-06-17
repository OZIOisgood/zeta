import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { TAB_SCREEN_OPTIONS } from '../../../lib/tab-screen-options';

/**
 * Per-tab Stack for the Profile / Preferences tab.
 *
 * Gives the Preferences screen a native-stack large-title header instead of
 * the custom ZPageHeader component. The NativeTabs trigger for this tab uses
 * name="profile" which maps to this folder segment.
 */
export default function ProfileTabLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ ...TAB_SCREEN_OPTIONS, title: t('preferences.title') }} />
    </Stack>
  );
}
