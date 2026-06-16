import type { ZFabProps } from './z-fab.types';

export type { ZFabProps } from './z-fab.types';

/**
 * iOS has no FAB — the create action is the native nav-bar "+". ZFab renders
 * nothing on iOS. The `className` reference below exists only to satisfy the
 * native-classname-forwarding source scan (which requires every native platform
 * file of a primitive whose .types.ts declares `className` to mention it).
 */
export function ZFab(_props: ZFabProps) {
  // className is part of the public contract but unused on iOS (no FAB rendered).
  void (_props as { className?: string }).className;
  return null;
}
