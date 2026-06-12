import { useState } from 'react';
import { Text, View } from 'react-native';
import { makeRedirectUri, ResponseType, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { ZButton } from '../components/ui/z-button';
import { completeLogin, stashCodeVerifier, workosClientId, workosDiscovery } from '../auth/login';
import { authStore } from '../auth/auth-store';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({ scheme: 'zeta', path: 'auth/callback' });

if (__DEV__) {
  // In Expo Go this is an exp:// URI that depends on the dev machine's
  // address — it must be registered verbatim in the WorkOS dashboard.
  console.log('AuthKit redirect URI:', redirectUri);
}

export default function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: workosClientId(),
      redirectUri,
      responseType: ResponseType.Code,
      usePKCE: true,
      scopes: [],
      extraParams: { provider: 'authkit' },
    },
    workosDiscovery,
  );

  async function signIn() {
    if (!request) return;
    setBusy(true);
    setFailed(false);
    try {
      // Stash the verifier first: in Expo Go the redirect may reload the
      // project, in which case the auth/callback route finishes the login.
      if (request.codeVerifier) await stashCodeVerifier(request.codeVerifier);
      const result = await promptAsync();
      if (result.type !== 'success' || !result.params.code) {
        if (result.type !== 'cancel' && result.type !== 'dismiss') setFailed(true);
        return;
      }
      const ok = await completeLogin(result.params.code);
      if (!ok && authStore.getState().status !== 'signedIn') setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-z-bg px-8">
      <Text className="text-3xl font-bold text-z-text">Zeta</Text>
      <Text className="text-center text-z-muted">
        Digital video coaching — sign in to continue.
      </Text>
      <View className="w-full">
        <ZButton label={busy ? 'Signing in…' : 'Sign in'} onPress={signIn} disabled={busy || !request} />
      </View>
      {failed ? <Text className="text-z-danger">Sign-in failed. Please try again.</Text> : null}
    </View>
  );
}
