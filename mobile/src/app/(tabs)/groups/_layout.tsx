import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTabScreenOptions } from '../../../lib/tab-screen-options';

/**
 * Per-tab Stack for the Groups tab.
 *
 * Gives the Groups screen a native-stack large-title header instead of the
 * custom ZPageHeader component. The NativeTabs trigger for this tab uses
 * name="groups" which maps to this folder segment.
 */
export default function GroupsTabLayout() {
  const { t } = useTranslation();
  const tabScreenOptions = useTabScreenOptions();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ ...tabScreenOptions, title: t('groups.myGroups') }} />
    </Stack>
  );
}
