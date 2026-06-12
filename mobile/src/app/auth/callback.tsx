import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { completeLogin } from '../../auth/login';
import { useAuth } from '../../auth/auth-store';
import { ZScreen } from '../../components/ui/z-screen';
import { colors } from '../../theme/colors';

/**
 * Landing route for the AuthKit redirect (zeta://auth/callback resp.
 * exp://…/--/auth/callback). When Expo Go reloads the project on redirect,
 * this route owns the token exchange: it picks up the authorization code
 * from the URL and the stashed PKCE verifier from SecureStore. When the
 * redirect merely resumes the app, the login screen completes the exchange
 * and the single-flight guard in completeLogin makes this a no-op.
 */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const status = useAuth((s) => s.status);
  const [exchanging, setExchanging] = useState(() => typeof code === 'string' && code.length > 0);

  useEffect(() => {
    if (typeof code !== 'string' || code.length === 0) return;
    let stale = false;
    completeLogin(code)
      .catch(() => undefined)
      .finally(() => {
        if (!stale) setExchanging(false);
      });
    return () => {
      stale = true;
    };
  }, [code]);

  if (status === 'signedIn') return <Redirect href="/" />;
  if (!exchanging && status !== 'loading') return <Redirect href="/login" />;

  return (
    <ZScreen className="items-center justify-center">
      <ActivityIndicator size="large" color={colors.primary} />
    </ZScreen>
  );
}
