import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "zeta_access_token";
const REFRESH_TOKEN_KEY = "zeta_refresh_token";

export const tokenStorage = {
  getAccessToken: () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
  setAccessToken: (token: string) =>
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) =>
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};

/** Decode a JWT payload without verifying the signature. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** True if the JWT is expired or within 60 seconds of expiry. */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp < Date.now() / 1000 + 60;
}
