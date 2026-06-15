import { useCallback, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { selectStore } from '../../components/ui/z-combobox';
import { ZScreen } from '../../components/ui/z-screen';
import { ZTextInput } from '../../components/ui/z-text-input';
import { ZSymbol } from '../../components/ui/z-symbol';
import { Touchable } from '../../components/ui/touchable';
import { colors } from '../../theme/colors';

/**
 * Pushed searchable selection screen for ZCombobox.
 *
 * Receives the active select request from the selectStore (not from route
 * params — options arrays and callbacks cannot be serialised as params).
 * The `field` route param is used only to generate a unique route URL.
 *
 * iOS idiom: pushed screen with a text search field + FlatList
 *   (HIG: "Search interfaces" — navigate to a dedicated list screen for
 *    large or searchable option sets).
 * Android idiom: pushed screen with Material 3 SearchBar-style input + list.
 *
 * On row tap: calls store.onSelect(value) → router.back().
 * Selected row shows a checkmark to mirror the web combobox's active item.
 *
 * i18n: uses existing keys from the synced dashboard JSONs:
 *   - common.search — fallback search placeholder
 *   - common.actions.back — back button (via native Stack.Screen headerLeft)
 *   - Caller-supplied searchPlaceholder / title from the store request.
 */
export default function SelectFieldScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  // field param is present in the URL; actual data comes from the store.
  useLocalSearchParams<{ field: string }>();

  const request = selectStore.getState().request;
  const [query, setQuery] = useState('');

  const options = request?.options ?? [];
  const selectedValue = request?.value;
  const title = request?.title ?? t('common.search');
  const searchPlaceholder = request?.searchPlaceholder ?? t('common.search');

  const filtered = query.trim()
    ? options.filter((opt) => opt.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const handleSelect = useCallback(
    (value: string) => {
      request?.onSelect(value);
      selectStore.getState().clear();
      router.back();
    },
    [request, router],
  );

  function handleBack() {
    selectStore.getState().clear();
    router.back();
  }

  return (
    <ZScreen>
      {/* Native header with a custom back handler to clear the selectStore
          before popping. headerLeft overrides the default back chevron so the
          store-clear side effect fires even on an explicit tap (swipe-back also
          triggers the standard navigator pop, which is acceptable — the store
          is cleared on the next open anyway). */}
      <Stack.Screen
        options={{
          title,
          headerLeft: () => (
            <TouchableOpacity
              accessibilityLabel={t('common.actions.back')}
              onPress={handleBack}
              style={{ paddingLeft: 8 }}
            >
              <ZSymbol
                name="back"
                label={t('common.actions.back')}
                size={22}
                color={colors.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <View className="px-4 pb-2 pt-1">
        <ZTextInput
          accessibilityLabel={searchPlaceholder}
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(opt) => opt.value}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View testID="select-empty" className="items-center px-4 py-12">
            <Text className="text-sm text-z-muted">{t('common.noResults')}</Text>
          </View>
        }
        renderItem={({ item: opt }) => {
          const isSelected = opt.value === selectedValue;
          return (
            <Touchable
              accessibilityLabel={opt.label}
              selected={isSelected}
              onPress={() => handleSelect(opt.value)}
            >
              <View className="flex-row items-center justify-between border-b border-z-border px-4 py-3">
                <Text
                  className={
                    isSelected
                      ? 'flex-1 font-semibold text-z-primary-strong'
                      : 'flex-1 text-z-text'
                  }
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
                {isSelected ? (
                  <ZSymbol name="check" label={opt.label} size={18} color={colors.primary} />
                ) : null}
              </View>
            </Touchable>
          );
        }}
      />
    </ZScreen>
  );
}
