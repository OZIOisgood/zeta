import { Platform } from 'react-native';
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
          // Material-3 scroll-edge top app bar: flat at rest, elevated only once
          // content scrolls under the bar. Android starts flat-at-rest (no
          // first-frame shadow flash) and useHeaderScrollEdge toggles this on
          // scroll. iOS gets `undefined` here so its native large-title header
          // keeps its own scroll-edge hairline (forcing it flat fights the OS).
          headerShadowVisible: Platform.select({ android: false }),
        }}
      />
    </Stack>
  );
}
