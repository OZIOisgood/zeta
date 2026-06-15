import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeRedirectUri, ResponseType, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { ZButton } from '../components/ui/z-button';
import { ZCard } from '../components/ui/z-card';
import { ZScreen } from '../components/ui/z-screen';
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
  const { t } = useTranslation();
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
    <ZScreen className="items-center justify-center px-6">
      <View className="w-full max-w-sm">
        <ZCard className="p-8">
          {/* Brand mark — text only; the web card pairs this with a logo image
              asset that does not yet exist in mobile assets (see follow-up). */}
          <View className="flex-row items-center gap-3">
            <View className="size-11 shrink-0 items-center justify-center rounded-lg bg-z-primary-soft">
              <Text className="text-lg font-bold text-z-primary-strong">{t('app.brand')[0]}</Text>
            </View>
            <View>
              <Text className="text-sm font-semibold text-z-text">{t('app.brand')}</Text>
              <Text className="text-xs text-z-muted">{t('app.tagline')}</Text>
            </View>
          </View>

          {/* Heading + description. */}
          <Text className="mt-7 text-xl font-semibold text-z-text">{t('auth.login.heading')}</Text>
          <Text className="mt-2 text-sm leading-6 text-z-muted">
            {t('auth.login.subtitle')}
          </Text>

          <View className="mt-7">
            <ZButton
              label={t('auth.login.signIn')}
              onPress={signIn}
              loading={busy}
              disabled={!request}
              testID="login-submit"
            />
          </View>

          {failed ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              className="mt-4 text-sm text-z-danger"
            >
              {t('auth.login.failed')}
            </Text>
          ) : null}
        </ZCard>
      </View>
    </ZScreen>
  );
}
