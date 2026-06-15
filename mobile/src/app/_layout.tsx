import '../../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { initI18n } from '../i18n';
import { authStore, useAuth } from '../auth/auth-store';
import { queryClient } from '../api/query-client';
import { colors } from '../theme/colors';
import { ZToastHost } from '../components/ui/z-toast';

void initI18n();

/** Shared options applied to every detail/form screen that gets a native header.
 *  - headerBackButtonDisplayMode:'minimal' → iOS shows only the chevron, no
 *    label (HIG recommendation for deeper stacks; avoids long dynamic titles
 *    appearing in the back button of a subsequent push).
 *  - headerTintColor: accent orange for the interactive back chevron/button.
 *  - headerStyle / headerTitleStyle: neutral chrome so only interactive items
 *    carry the accent — not the title itself. */
const DETAIL_SCREEN_OPTIONS = {
  headerShown: true,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerTintColor: colors.primary,
  headerStyle: { backgroundColor: colors.bg },
  headerTitleStyle: { color: colors.text },
} as const;

export default function RootLayout() {
  const status = useAuth((s) => s.status);

  useEffect(() => {
    void authStore.getState().restore();
  }, []);

  const content =
    status === 'loading' ? (
      <View className="flex-1 items-center justify-center bg-z-bg">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    ) : (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(tabs)" />
          {/* Detail / form screens — native header with back + swipe-back.
              Dynamic titles (asset/[id], group/[id]) are set inside the screen
              component via <Stack.Screen options={{ title }} /> once data loads. */}
          <Stack.Screen name="asset/[id]" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="group/[id]" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="group/[id]/preferences" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="group/create" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="availability" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="notifications" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="reports" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="select/[field]" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="invite" options={DETAIL_SCREEN_OPTIONS} />
          {/* Modal screens — presentation overrides headerShown:false from
              screenOptions; the screen itself sets its own header/title. */}
          <Stack.Screen name="upload" options={{ presentation: 'modal' }} />
          <Stack.Screen name="book" options={{ presentation: 'modal' }} />
          {/* Full-screen live call — keeps its own chrome, no nav header. */}
          <Stack.Screen name="call/[bookingId]" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={status !== 'signedIn'}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    );

  return (
    <QueryClientProvider client={queryClient}>
      {content}
      <ZToastHost />
    </QueryClientProvider>
  );
}
