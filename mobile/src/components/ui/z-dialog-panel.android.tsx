/**
 * ZDialogPanel — Android entry: the shared RN implementation (M3 basic dialog).
 *
 * Compose retreat (2026-07-03): the @expo/ui (~56.0.17) Compose
 * `ModalBottomSheet` never renders its window when hosted from RN — neither
 * bare, nor wrapped in `<Host>`/`<Host matchContents>`, with RN children direct
 * or Host-bridged. Verified on a dev build (the sheet composes to nothing;
 * unwrapped it logs "must be rendered as a direct child of a <Host>"). Same
 * precedent as z-card.android.
 *
 * The availability sheets moved to native formSheet ROUTES
 * (availability-session-type / availability-slot / availability-blocked);
 * this panel remains for the small component-level dialogs only.
 */
export { ZDialogPanelShared as ZDialogPanel } from './z-dialog-panel.shared';
export type { ZDialogPanelProps } from './z-dialog-panel.types';
