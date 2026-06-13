import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

/**
 * Thin wrapper around RN `KeyboardAvoidingView` for input screens. Uses the
 * `padding` behavior on iOS (where the keyboard overlaps content) and no
 * behavior on Android (which already resizes the window). Fills its parent.
 */
export function ZKeyboardAvoidingView({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className={`flex-1 ${className}`}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
