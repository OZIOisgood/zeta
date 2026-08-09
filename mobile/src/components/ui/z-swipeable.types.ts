import type { ReactNode } from 'react';

/**
 * ZSwipeable — swipe-to-reveal trailing action.
 *
 * Tier: native
 *
 * A horizontally swipeable row that reveals a single trailing destructive
 * action (right-to-left swipe). On device it uses react-native-gesture-handler's
 * `ReanimatedSwipeable` (.ios/.android → .shared). The bare `.tsx` fallback
 * (web / Storybook / jest — RNGH is native-only) renders the row with the
 * action exposed as a persistent accessible control, so the action stays
 * reachable and testable off-device.
 *
 * SOTA: a trailing destructive action revealed by swipe (iOS Mail / Material
 * "swipe to reveal" pattern). The reveal does NOT auto-fire on a full swipe —
 * the user taps the revealed action — so a destructive action is never
 * triggered by an accidental fling. Requires <GestureHandlerRootView> at the
 * app root (app/_layout.tsx).
 */
export type ZSwipeableProps = {
  /** The row content (e.g. a card). */
  children: ReactNode;
  /** Accessible label for the revealed trailing action (e.g. "Cancel Session"). */
  actionLabel: string;
  /** Icon shown above/beside the action label — tint it for the danger fill. */
  actionIcon?: ReactNode;
  /** Fired when the revealed trailing action is activated. */
  onAction: () => void;
  testID?: string;
};
