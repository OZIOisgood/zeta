/**
 * ZTabs — shared public API types (Tier: Native)
 *
 * In-page segmented filter (NOT bottom navigation). Platform variants:
 *   - z-tabs.tsx          — NativeWind fallback (web / Storybook / jest)
 *   - z-tabs.ios.tsx      — SwiftUI Picker with pickerStyle('segmented')
 *   - z-tabs.android.tsx  — @expo/ui/jetpack-compose SingleChoiceSegmentedButtonRow
 *
 * Count-badge note: native segmented controls have no badge slot.
 * When `count` is defined the label is formatted as "Label (N)" so the
 * count is visible in both native variants. The bare fallback still renders
 * the ZBadge separately to preserve the richer web/Storybook appearance.
 */

export type ZTab = {
  /** Unique identifier for this tab, used as the `activeId`/`onChange` key. */
  id: string;
  /** User-visible label text. */
  label: string;
  /**
   * Optional item count. In the bare fallback rendered via `ZBadge`.
   * In native variants appended to the label: "Label (N)".
   */
  count?: number;
};

export type ZTabsProps = {
  /** Ordered list of tabs to render. */
  tabs: ZTab[];
  /** The `id` of the currently active tab. */
  activeId: string;
  /** Called with the `id` of the tab the user selected. */
  onChange: (id: string) => void;
  /** Test identifier forwarded to the root element. */
  testID?: string;
};
