/**
 * ZEmptyState — iOS implementation (SwiftUI via @expo/ui/swift-ui).
 *
 * Renders a native SwiftUI ContentUnavailableView (iOS 17+). This is the
 * canonical HIG-blessed empty-state widget:
 *   - `title`       → ContentUnavailableView title
 *   - `description` → ContentUnavailableView description
 *   - `iconSystemImage` → ContentUnavailableView systemImage (SF Symbol)
 *   - `children`    → action slot rendered BELOW the ContentUnavailableView
 *                     in a RN View, because @expo/ui does not expose an
 *                     actions slot for ContentUnavailableView.
 *
 * The `icon` ReactNode prop is ignored on iOS; callers should pass
 * `iconSystemImage` (an SF Symbol name) for native icon rendering.
 * When neither is provided, no systemImage is set and ContentUnavailableView
 * uses its default appearance (title + description only).
 *
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/empty-states
 * @expo/ui version: ~56.0.17
 * @platform ios 17.0+
 */

import { ContentUnavailableView, Host } from '@expo/ui/swift-ui';
import { View } from 'react-native';
import type { ZEmptyStateProps } from './z-empty-state.types';

export type { ZEmptyStateProps } from './z-empty-state.types';

// Extract the systemImage type directly from ContentUnavailableView props so
// we don't need a direct import of sf-symbols-typescript (a transitive dep
// only available inside @expo/ui's own package graph).
type SystemImage = NonNullable<Parameters<typeof ContentUnavailableView>[0]['systemImage']>;

export function ZEmptyState({ title, description, iconSystemImage, children }: ZEmptyStateProps) {
  return (
    <View>
      <Host matchContents={{ vertical: true }}>
        <ContentUnavailableView
          title={title}
          description={description}
          // Cast to the extracted SystemImage type. Our public API uses plain
          // `string` to avoid the transitive dependency; invalid symbol names
          // are silently ignored by iOS at runtime.
          systemImage={iconSystemImage as SystemImage | undefined}
        />
      </Host>
      {children ? (
        <View style={{ alignItems: 'center', marginTop: 16 }}>{children}</View>
      ) : null}
    </View>
  );
}
