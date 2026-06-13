import { useState } from 'react';
import { FlatList, Modal, Pressable, Text } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { ZTextInput } from './z-text-input';

export type ZComboboxOption = { value: string; label: string };

/**
 * Searchable single-choice select. Mobile counterpart of the web `z-combobox`
 * wrapper (web/dashboard-next/src/app/shared/ui/combobox/). Reuses the
 * `z-select` trigger + Modal-list pattern, adding a search field that filters
 * the options by label.
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
}: {
  value?: string;
  options: ZComboboxOption[];
  placeholder?: string;
  onValueChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  searchPlaceholder?: string;
  closeLabel?: string;
  testID?: string;
}) {
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
        className={`min-h-11 w-full flex-row items-center justify-between rounded-md border px-3 py-2 ${
          disabled ? 'bg-z-surface-warm' : 'bg-z-surface'
        } ${invalid ? 'border-z-danger' : 'border-z-border'}`}
      >
        <Text className={selectedLabel ? 'text-z-text' : 'text-z-muted'}>
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
