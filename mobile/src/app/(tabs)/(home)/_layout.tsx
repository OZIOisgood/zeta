import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Per-tab Stack for the Home tab.
 *
 * Gives the Home screen a native-stack large-title header (UINavigationController
 * large title on iOS / Material top app bar on Android) instead of the custom
 * ZPageHeader component. The NativeTabs trigger for this tab uses name="(home)"
 * which maps to this group segment.
 */
export default function HomeTabLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t('common.nav.home'),
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
