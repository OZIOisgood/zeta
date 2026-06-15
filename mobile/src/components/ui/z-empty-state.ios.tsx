/**
 * ZEmptyState — iOS implementation (SwiftUI via @expo/ui/swift-ui).
 *
 * Renders a native SwiftUI ContentUnavailableView (iOS 17+). This is the
 * canonical HIG-blessed empty-state widget:
 *   - `title`       → ContentUnavailableView title
 *   - `description` → ContentUnavailableView description
 *   - `iconSystemImage` → ContentUnavailableView systemImage (SF Symbol)
 *   - `icon`        → bridged to an SF Symbol name via the ZSymbol map when
 *                     the element's props carry a `name` key in SYMBOL_MAP.
 *                     Falls back to `'tray'` (generic empty) when no match.
 *                     Explicit `iconSystemImage` always wins over `icon`.
 *   - `children`    → action slot rendered BELOW the ContentUnavailableView
 *                     in a RN View, because @expo/ui does not expose an
 *                     actions slot for ContentUnavailableView.
 *
 * Priority: iconSystemImage (explicit) > icon ReactNode (ZSymbol bridge) >
 *           'tray' default.
 *
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/empty-states
 * @expo/ui version: ~56.0.17
 * @platform ios 17.0+
 */

import React from 'react';
import { ContentUnavailableView, Host } from '@expo/ui/swift-ui';
import { View } from 'react-native';
import { SYMBOL_MAP } from './z-symbol.map';
import type { ZSymbolName } from './z-symbol.types';
import type { ZEmptyStateProps } from './z-empty-state.types';

export type { ZEmptyStateProps } from './z-empty-state.types';

// Extract the systemImage type directly from ContentUnavailableView props so
// we don't need a direct import of sf-symbols-typescript (a transitive dep
// only available inside @expo/ui's own package graph).
type SystemImage = NonNullable<Parameters<typeof ContentUnavailableView>[0]['systemImage']>;

/**
 * Resolve an SF Symbol name from the `icon` ReactNode when it is a ZSymbol
 * element (duck-typed by the presence of a `name` prop that exists in
 * SYMBOL_MAP). Returns undefined when the icon is not a ZSymbol or has no
 * matching map entry.
 */
function sfNameFromIcon(icon: React.ReactNode): string | undefined {
  if (!React.isValidElement(icon)) return undefined;
  const props = icon.props as Record<string, unknown>;
  const name = props['name'];
  if (typeof name === 'string' && Object.prototype.hasOwnProperty.call(SYMBOL_MAP, name)) {
    return SYMBOL_MAP[name as ZSymbolName].sf;
  }
  return undefined;
}

/** Default SF Symbol used when neither iconSystemImage nor a ZSymbol icon is provided. */
const DEFAULT_SF_SYMBOL = 'tray';

export function ZEmptyState({ title, description, iconSystemImage, icon, children }: ZEmptyStateProps) {
  // Priority: explicit iconSystemImage > ZSymbol icon bridge > default 'tray'
  const resolvedSymbol: string =
    iconSystemImage ?? sfNameFromIcon(icon) ?? DEFAULT_SF_SYMBOL;

  return (
    <View>
      <Host matchContents={{ vertical: true }}>
        <ContentUnavailableView
          title={title}
          description={description}
          // Cast to the extracted SystemImage type. Our public API uses plain
          // `string` to avoid the transitive dependency; invalid symbol names
          // are silently ignored by iOS at runtime.
          systemImage={resolvedSymbol as SystemImage}
        />
      </Host>
      {children ? (
        <View style={{ alignItems: 'center', marginTop: 16 }}>{children}</View>
      ) : null}
    </View>
  );
}
