import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../auth/auth-store';
import { colors } from '../../theme/colors';

/**
 * Landing route for the AuthKit redirect (zeta://auth/callback resp.
 * exp://…/--/auth/callback). expo-auth-session consumes the authorization
 * code from the URL itself — this screen only gives expo-router a matching
 * route. While the token exchange is still in flight the user sees a
 * spinner; afterwards the auth status decides where they land. Redirecting
 * to a guard-protected route while signed out would dead-end on a blank
 * screen, hence the explicit /login fallback.
 */
export default function AuthCallback() {
  const status = useAuth((s) => s.status);

  if (status === 'signedIn') return <Redirect href="/" />;
  if (status === 'signedOut') return <Redirect href="/login" />;

  return (
    <View className="flex-1 items-center justify-center bg-z-bg">
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
