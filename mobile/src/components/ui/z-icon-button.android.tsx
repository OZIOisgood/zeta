/**
 * ZIconButton — Android entry: the shared RN implementation.
 *
 * Compose retreat (2026-07-03): the @expo/ui (~56.0.17) Compose
 * IconButton/FilledIconButton/OutlinedIconButton/FloatingActionButton showed
 * TWO device-verified structural defects:
 *   1. The RN interop icon child swallowed taps on the icon area — every icon
 *      button had a dead center exactly where users tap (mitigated with
 *      pointerEvents="none", commit 663e9b4, but see 2.).
 *   2. First-paint blank: icon buttons inside list rows render EMPTY when their
 *      Host mounts in a non-initial commit (new row after a mutation refetch,
 *      or any remount via tab switch) — same disease as z-card.android
 *      (mobile-expo-ui-host-first-paint). Recompose/remount do not recover.
 *
 * Same retreat precedent as z-card / z-fab / z-dialog-panel: Android uses the
 * shared RN Pressable implementation, which forwards className (and all other
 * public props) natively — the source-level className-forwarding guard checks
 * this file for that word.
 */
export { ZIconButtonShared as ZIconButton } from './z-icon-button.shared';
export type { ZIconButtonVariant, ZIconButtonSize, ZIconButtonShape, ZIconButtonProps } from './z-icon-button.types';
