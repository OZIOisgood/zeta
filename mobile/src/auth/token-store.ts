import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'zeta.accessToken';
const REFRESH_KEY = 'zeta.refreshToken';

export type TokenPair = { accessToken: string; refreshToken: string };

export async function getTokens(): Promise<TokenPair | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function setTokens(tokens: TokenPair): Promise<void> {
  // expo-secure-store documents ~2048 bytes per value as the safe ceiling;
  // WorkOS access tokens grow with the permissions claim, so surface it
  // early in development instead of failing silently on device.
  if (__DEV__ && tokens.accessToken.length > 2048) {
    console.warn(
      `Access token is ${tokens.accessToken.length} bytes — values above 2048 bytes may fail to persist in SecureStore on some platforms.`,
    );
  }
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
