import { Tabs } from 'expo-router';
import { CalendarClock, Home, UserRound, Users, Video } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/auth-store';
import { colors } from '../../theme/colors';

export default function TabsLayout() {
  const { t } = useTranslation();
  // Mirror the web shell nav gating (shell.component.ts): Groups → groups:read,
  // Sessions/Coaching → coaching:bookings:read. expo-router only mounts the
  // <Tabs.Screen> entries we render, so omitting one hides its tab + route.
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const has = (perm: string) => permissions !== null && permissions.includes(perm);
  const canSeeGroups = has('groups:read');
  const canSeeCoaching = has('coaching:bookings:read');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('common.nav.home'), tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="videos"
        options={{ title: t('common.nav.videos'), tabBarIcon: ({ color, size }) => <Video color={color} size={size} /> }}
      />
      {canSeeCoaching ? (
        <Tabs.Screen
          name="coaching"
          options={{ title: t('common.nav.sessions'), tabBarIcon: ({ color, size }) => <CalendarClock color={color} size={size} /> }}
        />
      ) : null}
      {canSeeGroups ? (
        <Tabs.Screen
          name="groups"
          options={{ title: t('common.nav.groups'), tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
        />
      ) : null}
      <Tabs.Screen
        name="profile"
        options={{ title: t('preferences.title'), tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }}
      />
    </Tabs>
  );
}
