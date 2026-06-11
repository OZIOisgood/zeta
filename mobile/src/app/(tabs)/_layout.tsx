import { Tabs } from 'expo-router';
import { CalendarClock, UserRound, Users, Video } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        // --z-primary / --z-muted tokens; React Navigation options cannot read CSS vars
        tabBarActiveTintColor: '#ea580c',
        tabBarInactiveTintColor: '#735f4d',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Videos', tabBarIcon: ({ color, size }) => <Video color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="coaching"
        options={{ title: 'Coaching', tabBarIcon: ({ color, size }) => <CalendarClock color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="groups"
        options={{ title: 'Groups', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }}
      />
    </Tabs>
  );
}
