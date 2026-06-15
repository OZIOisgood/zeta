import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Per-tab Stack for the Coaching / Sessions tab.
 *
 * Gives the Sessions screen a native-stack large-title header instead of the
 * custom ZPageHeader component. The NativeTabs trigger for this tab uses
 * name="coaching" which maps to this folder segment.
 */
export default function CoachingTabLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t('sessions.title'),
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
