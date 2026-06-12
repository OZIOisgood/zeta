import { Redirect } from 'expo-router';

/**
 * Landing route for the AuthKit redirect (zeta://auth/callback resp.
 * exp://…/--/auth/callback). expo-auth-session consumes the authorization
 * code from the URL itself — this screen only exists so expo-router has a
 * matching route and sends the user back into the app instead of showing
 * "Unmatched route". The auth gate in _layout.tsx then lands them on the
 * Videos tab once the token exchange finishes.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
