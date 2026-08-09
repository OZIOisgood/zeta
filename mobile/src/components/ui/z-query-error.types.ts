/**
 * ZQueryError — shared public API types (Tier: Native)
 *
 * Composes ZEmptyState + ZButton (retry). Platform variants:
 *   - z-query-error.tsx          — NativeWind fallback (web / Storybook / jest)
 *   - z-query-error.ios.tsx      — passes iconSystemImage to ZEmptyState.ios
 *   - z-query-error.android.tsx  — passes icon ReactNode to ZEmptyState.android
 *
 * The retry button is always rendered via ZButton (same on all platforms).
 * On iOS the retry button appears below ContentUnavailableView since that
 * widget has no native actions slot.
 */

export type ZQueryErrorProps = {
  /** Title text for the error state. */
  title: string;
  /**
   * Description text. Defaults to `t('home.error.description')` when omitted.
   */
  description?: string;
  /**
   * Label for the retry button. Defaults to `t('common.actions.retry')` when
   * omitted.
   */
  retryLabel?: string;
  /** Called when the user presses the retry button. */
  onRetry: () => void;
  /** Test identifier forwarded to the retry button. */
  testID?: string;
};
