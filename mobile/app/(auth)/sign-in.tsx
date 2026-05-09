import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { tokenStorage } from "@/lib/token-storage";
import { Pressable, Text, View } from "@/tw";
import { makeRedirectUri } from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Alert } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URI = makeRedirectUri({ scheme: "zeta", path: "auth/callback" });

export default function SignInScreen() {
  const router = useRouter();
  const { bootstrap } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    setIsLoading(true);
    try {
      // 1. Get WorkOS authorization URL from backend
      const { url } = await api.get<{ url: string }>("/auth/mobile/auth-url");

      // 2. Open in-app browser; WorkOS redirects to zeta://auth/callback?code=...
      const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT_URI);

      if (result.type !== "success") {
        return; // user cancelled
      }

      // 3. Extract code from the redirect URL
      const redirectUrl = new URL(result.url);
      const code = redirectUrl.searchParams.get("code");
      if (!code) {
        Alert.alert("Sign in failed", "No authorization code received.");
        return;
      }

      // 4. Exchange code for tokens
      const tokens = await api.post<{
        access_token: string;
        refresh_token: string;
      }>("/auth/mobile/exchange", { code });

      await tokenStorage.setAccessToken(tokens.access_token);
      await tokenStorage.setRefreshToken(tokens.refresh_token);

      // 5. Load the user into the store
      await bootstrap();

      router.replace("/(app)");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      Alert.alert("Sign in failed", message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-sf-bg px-8">
      <Text className="text-4xl font-bold text-sf-text mb-2">Zeta</Text>
      <Text className="text-base text-sf-text/60 mb-12 text-center">
        Your video coaching platform
      </Text>

      <Pressable
        className="w-full bg-accent rounded-2xl py-4 items-center active:opacity-80"
        onPress={handleSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">
            Continue with Zeta
          </Text>
        )}
      </Pressable>
    </View>
  );
}
