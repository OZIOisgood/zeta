import { useState } from 'react';
import { FlatList, Modal, Pressable, Text } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { ZTextInput } from './z-text-input';
import type { ZComboboxProps } from './z-combobox.types';

export type { ZComboboxOption, ZComboboxProps } from './z-combobox.types';
export { selectStore, openSelect, useSelectRequest } from './z-combobox.shared';
export type { SelectRequest } from './z-combobox.shared';

/**
 * Searchable single-choice select — NativeWind fallback (web / Storybook / jest).
 *
 * Mobile counterpart of the web `z-combobox` wrapper
 * (web/dashboard-next/src/app/shared/ui/combobox/). Reuses the
 * `z-select` trigger + Modal-list pattern, adding a search field that filters
 * the options by label.
 *
 * On iOS this file is superseded by z-combobox.ios.tsx (native trigger →
 * pushed /select/[field] screen). On Android this file is superseded by
 * z-combobox.android.tsx. This bare fallback is the test surface and Storybook
 * entry point. The Modal-based inline sheet remains the web/Storybook variant;
 * the native variants navigate to a dedicated search screen.
 */
export function ZCombobox({
  value,
  options,
  placeholder = '',
  onValueChange,
  invalid = false,
  disabled = false,
  accessibilityLabel,
  searchPlaceholder = '',
  closeLabel = 'Close',
  testID,
}: ZComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedLabel = options.find((option) => option.value === value)?.label;
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function close() {
    setOpen(false);
    setQuery('');
  }

  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{ minHeight: 52 }}
        className={`w-full flex-row items-center justify-between rounded-xl border px-3 py-3 ${
          disabled ? 'bg-surface-variant' : 'bg-background'
        } ${invalid ? 'border-role-danger' : 'border-outline'}`}
      >
        <Text
          numberOfLines={1}
          className={`flex-1 text-[15px] ${selectedLabel ? 'text-on-surface' : 'text-on-surface-variant'}`}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <ChevronDown color={colors.muted} size={18} />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
        <Pressable accessibilityLabel={closeLabel} onPress={close} className="flex-1 justify-end bg-black/40">
          <Pressable onPress={() => {}} className="m-4 rounded-lg border border-z-border bg-z-surface">
            <ZTextInput
              accessibilityLabel={searchPlaceholder || 'Search'}
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
            />
            <FlatList
              data={filtered}
              keyExtractor={(option) => option.value}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 320 }}
              renderItem={({ item: option }) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onValueChange(option.value);
                      close();
                    }}
                    className="border-b border-z-border px-4 py-3"
                  >
                    <Text
                      className={isSelected ? 'font-semibold text-z-primary-strong' : 'text-z-text'}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
