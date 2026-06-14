/**
 * ZCombobox — iOS implementation (Tier: Custom-RN).
 *
 * Renders a native-styled trigger that navigates to the pushed /select/[field]
 * search screen instead of opening an inline Modal. The search screen renders
 * a FlatList with a search field — the native iOS idiom for picking from a long
 * or searchable list (HIG: "Search interfaces").
 *
 * The shared selectStore holds the options array + onSelect callback so they
 * can be passed across the navigation boundary without route-param serialisation.
 *
 * Re-exports the full public surface (ZComboboxOption, ZComboboxProps) so
 * importers of './z-combobox' (which Metro resolves to this file on iOS) get
 * the complete API.
 *
 * ⚠️  Do NOT import from './z-combobox' here — Metro resolves that to THIS file
 * and causes an infinite self-re-export. Import shared pieces from
 * './z-combobox.shared' or './z-combobox.types'.
 */
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { openSelect } from './z-combobox.shared';
import type { ZComboboxProps } from './z-combobox.types';

export type { ZComboboxOption, ZComboboxProps } from './z-combobox.types';

/**
 * iOS ZCombobox trigger.
 *
 * On press: registers the request in the selectStore, then pushes the
 * /select/[field] screen. The field key is a stable string derived from the
 * accessibilityLabel (or a fallback) to ensure the route param is unique per
 * field instance.
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
  testID,
}: ZComboboxProps) {
  const router = useRouter();
  const selectedLabel = options.find((opt) => opt.value === value)?.label;
  // Derive a stable URL-safe key from the accessibilityLabel; fall back to
  // a generic slug. The key is only used as a route param to disambiguate
  // multiple comboboxes on the same screen — the store carries the real data.
  const fieldKey = (accessibilityLabel ?? 'field')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  function handlePress() {
    if (disabled) return;
    openSelect({
      fieldKey,
      options,
      value,
      onSelect: onValueChange,
      title: accessibilityLabel,
      searchPlaceholder,
    });
    router.push(`/select/${fieldKey}` as never);
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      className={`min-h-11 w-full flex-row items-center justify-between rounded-md border px-3 py-2 ${
        disabled ? 'bg-z-surface-warm' : 'bg-z-surface'
      } ${invalid ? 'border-z-danger' : 'border-z-border'}`}
    >
      <Text
        numberOfLines={1}
        className={`flex-1 ${selectedLabel ? 'text-z-text' : 'text-z-muted'}`}
      >
        {selectedLabel ?? placeholder}
      </Text>
      <ChevronDown color={colors.muted} size={18} />
    </Pressable>
  );
}
