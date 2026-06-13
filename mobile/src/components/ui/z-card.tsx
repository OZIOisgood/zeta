import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Section card surface. Mobile counterpart of the recurring web section
 * card (rounded-lg border bg-white p-4 shadow-sm); the border is the
 * delimiter on mobile instead of a shadow.
 */
export function ZCard({
  children,
  className,
  testID,
}: {
  children: ReactNode;
  className?: string;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      className={`rounded-lg border border-z-border bg-z-surface p-4${className ? ` ${className}` : ''}`}
    >
      {children}
    </View>
  );
}
