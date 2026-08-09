/**
 * ZIconButton — bare entry (web / Storybook / jest): the shared RN
 * implementation. This file is the public contract and test surface.
 *
 * Native implementations:
 *   - z-icon-button.ios.tsx → SwiftUI Button via @expo/ui/swift-ui
 *   - z-icon-button.android.tsx → shared RN implementation (Compose retreat —
 *     see that file for the two device-verified Compose defects)
 *
 * DO NOT add @expo/ui imports here — this file must work in the web/Storybook
 * environment where native modules are unavailable.
 */
export { ZIconButtonShared as ZIconButton } from './z-icon-button.shared';
export type { ZIconButtonVariant, ZIconButtonSize, ZIconButtonShape, ZIconButtonProps } from './z-icon-button.types';
