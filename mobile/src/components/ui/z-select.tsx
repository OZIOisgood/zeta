import { useState } from 'react';
import { Modal, Pressable, Text } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { ZSelectProps } from './z-select.types';

export type { ZSelectOption, ZSelectProps } from './z-select.types';

/**
 * Single-choice select — NativeWind fallback (web / Storybook / jest).
 *
 * Mobile counterpart of the web `z-select` wrapper
 * (web/dashboard-next/src/app/shared/ui/select/). The web opens a hover
 * dropdown; the native equivalent is a trigger that opens a `Modal` list.
 *
 * On iOS this file is superseded by z-select.ios.tsx (SwiftUI Picker menu).
 * On Android this file is superseded by z-select.android.tsx (Compose
 * ExposedDropdownMenuBox). This bare fallback is the test surface and
 * Storybook entry point.
 */
export function ZSelect({
  value,
  options,
  placeholder = '',
  onValueChange,
  invalid = false,
  disabled = false,
  accessibilityLabel,
  testID,
}: ZSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`min-h-11 w-full flex-row items-center justify-between rounded-md border px-3 py-2 ${
          disabled ? 'bg-z-surface-warm' : 'bg-z-surface'
        } ${invalid ? 'border-z-danger' : 'border-z-border'}`}
      >
        <Text className={selectedLabel ? 'text-z-text' : 'text-z-muted'}>
          {selectedLabel ?? placeholder}
        </Text>
        <ChevronDown color={colors.muted} size={18} />
      </Pressable>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close"
          onPress={() => setOpen(false)}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable
            onPress={() => {}}
            className="m-4 rounded-lg border border-z-border bg-z-surface"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="border-b border-z-border px-4 py-3 last:border-b-0"
                >
                  <Text
                    className={
                      isSelected ? 'font-semibold text-z-primary-strong' : 'text-z-text'
                    }
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
