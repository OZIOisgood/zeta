import { Tabs } from "expo-router";
import { Platform } from "react-native";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === "ios" ? undefined : "#ffffff",
        },
        tabBarActiveTintColor: "#6366f1", // accent
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Videos",
          tabBarIcon: ({ color }) => null, // icons added in a later phase
        }}
      />
      <Tabs.Screen
        name="coaching"
        options={{
          title: "Coaching",
          tabBarIcon: ({ color }) => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => null,
        }}
      />
    </Tabs>
  );
}
