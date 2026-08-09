/**
 * ZBookingBar — persistent footer summary bar (Tier: Custom-RN composition).
 *
 * Native feel comes from its ZButton child; no platform split of its own. Must
 * be rendered as a SIBLING of the ScrollView inside ZScreen (not inside it) so
 * it stays pinned to the bottom. Left: a headline (e.g. duration) + a context
 * line, or a muted hint when nothing is selected yet. Right: the single CTA.
 */
export type ZBookingBarProps = {
  /** Bold headline, e.g. "30 min". Omit to show `hint` instead. */
  headline?: string;
  /** Muted placeholder shown when `headline` is absent. */
  hint?: string;
  /** Secondary context line under the headline (e.g. "Type · Expert · 16:00"). */
  context?: string;
  ctaLabel: string;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  onPress: () => void;
  testID?: string;
};
