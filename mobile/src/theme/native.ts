/**
 * theme/native.ts — token→modifier adapter for the Native tier.
 *
 * This is the SINGLE source Native-tier primitives (.ios.tsx / .android.tsx)
 * read brand/semantic/neutral color values from. Never hardcode hex values in
 * .ios.tsx or .android.tsx; always call into this module instead.
 *
 * The values come from the generated `roles` object in `./roles`; run
 * `pnpm run sync:tokens` to regenerate that file from the brand seed. Do not
 * edit roles.ts by hand.
 *
 * Usage in a native primitive:
 *   const { color } = useRoleColors();
 *   // @expo/ui SwiftUI modifier:
 *   <Button tint={color('accent')} ... />
 *   // Jetpack Compose color arg:
 *   <Button containerColor={color('accent')} ... />
 */

import { useColorScheme } from 'react-native';

import { roles } from './roles';

export type Scheme = 'light' | 'dark';
export type Role = keyof typeof roles.light;

/**
 * Resolves a semantic role to a hex color string for the given color scheme.
 */
export function roleColor(role: Role, scheme: Scheme): string {
  return roles[scheme][role];
}

/**
 * Convenience helper: returns the brand accent color for the given scheme.
 * Use this for `tint` / primary interactive elements.
 */
export function accentColor(scheme: Scheme): string {
  return roleColor('accent', scheme);
}

/**
 * React hook that reads the active color scheme and returns color helpers
 * bound to it. Native primitives use this so they don't have to call
 * useColorScheme() themselves.
 *
 * Example:
 *   const { color, scheme, roles: r } = useRoleColors();
 *   <Button tint={color('accent')} foregroundColor={color('onAccent')} />
 */
export function useRoleColors(): {
  scheme: Scheme;
  color: (role: Role) => string;
  roles: (typeof roles)[Scheme];
} {
  const raw = useColorScheme();
  const scheme: Scheme = raw === 'dark' ? 'dark' : 'light';
  return {
    scheme,
    color: (role: Role) => roleColor(role, scheme),
    roles: roles[scheme],
  };
}
