import '../../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { initI18n } from '../i18n';
import { authStore, useAuth } from '../auth/auth-store';
import { createQueryClient } from '../api/query-client';

const queryClient = createQueryClient();

void initI18n();

export default function RootLayout() {
  const status = useAuth((s) => s.status);

  useEffect(() => {
    void authStore.getState().restore();
  }, []);

  const content =
    status === 'loading' ? (
      <View className="flex-1 items-center justify-center bg-z-bg">
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    ) : (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(tabs)" />
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
