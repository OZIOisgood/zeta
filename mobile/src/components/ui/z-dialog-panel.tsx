/**
 * ZDialogPanel — bare entry (web / Storybook / jest): the shared RN
 * implementation (M3 basic dialog with dimmed backdrop). See
 * z-dialog-panel.shared.tsx for the component and z-dialog-panel.android.tsx
 * for why Android uses the same RN implementation instead of Compose.
 *
 * Native implementations:
 *   - z-dialog-panel.ios.tsx → SwiftUI BottomSheet
 *   - z-dialog-panel.android.tsx → shared RN implementation (Compose retreat)
 */
export { ZDialogPanelShared as ZDialogPanel } from './z-dialog-panel.shared';
export type { ZDialogPanelProps } from './z-dialog-panel.types';
