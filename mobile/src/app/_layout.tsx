import '../../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { initI18n } from '../i18n';
import { authStore, useAuth } from '../auth/auth-store';
import { queryClient } from '../api/query-client';
import { colors } from '../theme/colors';

void initI18n();

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
          <Stack.Screen name="asset/[id]" />
          <Stack.Screen name="group/[id]" />
          <Stack.Screen name="upload" options={{ presentation: 'modal' }} />
          <Stack.Screen name="book" options={{ presentation: 'modal' }} />
          <Stack.Screen name="invite" />
          <Stack.Screen name="call/[bookingId]" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={status !== 'signedIn'}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    );

  return (
    <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
  );
}
