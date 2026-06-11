import '../../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { initI18n } from '../i18n';
import { authStore, useAuth } from '../auth/auth-store';

void initI18n();

export default function RootLayout() {
  const status = useAuth((s) => s.status);

  useEffect(() => {
    void authStore.getState().restore();
  }, []);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-z-bg">
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={status !== 'signedIn'}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
