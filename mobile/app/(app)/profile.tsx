import { useAuthStore } from "@/lib/auth-store";
import { Pressable, Text, View } from "@/tw";
import { useRouter } from "expo-router";
import { Alert } from "react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  async function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-sf-bg px-6 pt-16">
      {user && (
        <>
          <Text className="text-2xl font-bold text-sf-text">
            {user.firstName} {user.lastName}
          </Text>
          <Text className="text-sm text-sf-text/60 mt-1">{user.email}</Text>
          <Text className="text-xs text-sf-text/40 mt-1 capitalize">
            {user.role}
          </Text>
        </>
      )}

      <Pressable
        className="mt-12 w-full bg-sf-bg-2 rounded-2xl py-4 items-center active:opacity-70"
        onPress={handleSignOut}
      >
        <Text className="text-sf-red font-semibold">Sign out</Text>
      </Pressable>
    </View>
  );
}
