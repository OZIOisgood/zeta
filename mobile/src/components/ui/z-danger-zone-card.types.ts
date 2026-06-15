/**
 * ZDangerZoneCard — shared public API types (Tier: Custom-RN)
 *
 * ZDangerZoneCard is a COMPOSITION primitive: it composes native sub-primitives
 * (ZCard → Section/Card, ZButton → native Button, ZConfirmDialog → Alert/formSheet,
 * ZIconTile → NativeWind tone tile) but has no .ios.tsx / .android.tsx of its own.
 * The destructive-action chrome is delegated entirely to its native children.
 *
 * Classified as a COMPOSITION_EXCEPTION in primitive-contract.test.ts:
 *   "No platform files — composes ZCard + ZButton + ZConfirmDialog + ZIconTile."
 *
 * Platform files:
 *   - z-danger-zone-card.tsx — single shared implementation (web / iOS / Android / jest)
 *
 * No .ios.tsx / .android.tsx — not applicable (composition, not direct native usage).
 */

export type ZDangerZoneCardProps = {
  /** Card heading — the destructive action name. */
  title: string;
  /** One or two-line explanation of what the action does. */
  description: string;
  /** Label on the danger trigger button. */
  actionLabel: string;
  /** Called only after the user confirms the ZConfirmDialog. */
  onAction: () => void;
  /** When true the button shows a loading indicator and confirm is disabled. */
  loading?: boolean;
  /** When true the trigger button is non-interactive. */
  disabled?: boolean;
  /** Title for the confirmation dialog. */
  confirmTitle: string;
  /** Body text for the confirmation dialog. */
  confirmMessage: string;
  /** Confirm button label inside the dialog. */
  confirmLabel: string;
  testID?: string;
};
