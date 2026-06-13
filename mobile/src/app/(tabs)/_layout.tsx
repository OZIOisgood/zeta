import { Tabs } from 'expo-router';
import { CalendarClock, Home, UserRound, Users, Video } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';

export default function TabsLayout() {
  const { t } = useTranslation();
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
      <Tabs.Screen
        name="coaching"
        options={{ title: t('common.nav.sessions'), tabBarIcon: ({ color, size }) => <CalendarClock color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="groups"
        options={{ title: t('common.nav.groups'), tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('preferences.title'), tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }}
      />
    </Tabs>
  );
}
