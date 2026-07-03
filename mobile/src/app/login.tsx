import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeRedirectUri, ResponseType, useAuthRequest } from 'expo-auth-session';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ZButton } from '../components/ui/z-button';
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
  // `error` arrives from auth/callback when its token exchange threw — the
  // callback route can't render the message itself (it always redirects here).
  const { error } = useLocalSearchParams<{ error?: string }>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(error === 'exchange');

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
  // Separate request for "Konto erstellen": AuthKit opens on the sign-up
  // screen via screen_hint (same PKCE flow; new users land waitlisted per the
  // invite-code soft launch and redeem a code afterwards).
  const [signUpRequest, , promptSignUpAsync] = useAuthRequest(
    {
      clientId: workosClientId(),
      redirectUri,
      responseType: ResponseType.Code,
      usePKCE: true,
      scopes: [],
      extraParams: { provider: 'authkit', screen_hint: 'sign-up' },
    },
    workosDiscovery,
  );

  async function runAuthFlow(
    req: typeof request,
    prompt: typeof promptAsync,
  ) {
    if (!req) return;
    setBusy(true);
    setFailed(false);
    try {
      // Stash the verifier first: in Expo Go the redirect may reload the
      // project, in which case the auth/callback route finishes the login.
      if (req.codeVerifier) await stashCodeVerifier(req.codeVerifier);
      const result = await prompt();
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

  const signIn = () => runAuthFlow(request, promptAsync);
  const signUp = () => runAuthFlow(signUpRequest, promptSignUpAsync);

  return (
    <ZScreen className="items-center justify-center px-6">
      <View className="w-full max-w-sm">
        {/* Brand block ABOVE the card (mock: centered column — logo tile 64,
            wordmark, tagline). Text-mark tile until a logo image asset exists. */}
        <View className="mb-7 items-center gap-2">
          <View className="size-16 items-center justify-center rounded-[20px] bg-z-primary-soft">
            <Text className="text-2xl font-extrabold text-z-primary-strong">{t('app.brand')[0]}</Text>
          </View>
          <Text className="text-lg font-extrabold text-z-text">{t('app.brand')}</Text>
          <Text className="text-xs text-z-muted">{t('app.tagline')}</Text>
        </View>

        <View className="rounded-[20px] bg-surface p-8">
          {/* Heading + description. */}
          <Text className="text-xl font-semibold text-z-text">{t('auth.login.heading')}</Text>
          <Text className="mt-2 text-sm leading-6 text-z-muted">
            {t('auth.login.subtitle')}
          </Text>

          {/* Two full-width CTAs (mock): sign in (primary) + create account
              (tonal, AuthKit sign-up screen via screen_hint). */}
          <View className="mt-7 gap-3">
            <ZButton
              label={t('auth.login.signIn')}
              onPress={() => void signIn()}
              loading={busy}
              disabled={!request}
              fullWidth
              testID="login-submit"
            />
            <ZButton
              label={t('auth.login.createAccount')}
              variant="tonal"
              onPress={() => void signUp()}
              disabled={!signUpRequest || busy}
              fullWidth
              testID="login-signup"
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
        </View>
      </View>
    </ZScreen>
  );
}
