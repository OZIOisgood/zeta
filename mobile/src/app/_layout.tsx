import '../../global.css';
import { Stack } from 'expo-router';
import { initI18n } from '../i18n';

void initI18n();

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
