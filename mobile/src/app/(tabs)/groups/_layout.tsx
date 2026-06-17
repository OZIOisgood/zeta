import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Per-tab Stack for the Groups tab.
 *
 * Gives the Groups screen a native-stack large-title header instead of the
 * custom ZPageHeader component. The NativeTabs trigger for this tab uses
 * name="groups" which maps to this folder segment.
 */
export default function GroupsTabLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t('groups.myGroups'),
          headerLargeTitle: true,
          // No bottom hairline under the large-title header (handoff TopBar has
          // none); the list scrolls under a flat, dividerless nav bar.
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
