import * as ImagePicker from 'expo-image-picker';
import { Text, View } from 'react-native';
import { ZAvatar } from './z-avatar';
import { ZButton } from './z-button';

/**
 * Pick/upload an avatar. Mobile counterpart of the web `z-avatar-input`
 * wrapper (web/dashboard-next/src/app/shared/ui/avatar-input/).
 * Shows the current avatar via `ZAvatar` plus a secondary button that opens
 * the image library; on a successful pick the base-64 payload is emitted.
 * `label` and `helperText` are passed already-translated by the consumer —
 * primitives do not translate. `helperText` mirrors the web requirement hint
 * (avatar.requirement) shown next to the select button.
 */
export function ZAvatarInput({
  value,
  onChange,
  fallback,
  alt,
  label,
  helperText,
  disabled = false,
  testID,
}: {
  value?: string;
  onChange: (base64: string) => void;
  fallback?: string;
  alt?: string;
  label: string;
  helperText?: string;
  disabled?: boolean;
  testID?: string;
}) {
  async function handlePick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;
    const base64 = result.assets[0]?.base64;
    if (base64) {
      onChange(base64);
    }
  }

  return (
    <View testID={testID} className="flex-row items-start gap-3">
      <ZAvatar image={value} fallback={fallback} alt={alt} size={72} />
      <View className="flex-1 gap-2">
        <View className="flex-row">
          <ZButton
            label={label}
            variant="secondary"
            disabled={disabled}
            onPress={() => void handlePick()}
          />
        </View>
        {helperText ? (
          <Text className="text-xs leading-5 text-z-muted">{helperText}</Text>
        ) : null}
      </View>
    </View>
  );
}
