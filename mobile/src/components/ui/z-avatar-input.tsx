import * as ImagePicker from 'expo-image-picker';
import { Text, View } from 'react-native';
import { ZAvatar } from './z-avatar';
import { ZButton } from './z-button';
import { ZSymbol } from './z-symbol';
import { Touchable } from './touchable';
import { useRoleColors } from '../../theme/native';

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
  centered = false,
  testID,
}: {
  value?: string;
  onChange: (base64: string) => void;
  fallback?: string;
  alt?: string;
  label: string;
  helperText?: string;
  disabled?: boolean;
  /**
   * Centered layout (handoff "Persönliche Daten"): a large tappable avatar with
   * an accent edit-badge overlay and the `label` as the caption beneath it,
   * instead of the inline avatar + secondary button. Default is the inline layout.
   */
  centered?: boolean;
  testID?: string;
}) {
  const { color } = useRoleColors();

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

  // Centered layout (handoff): large tappable avatar + accent edit-badge overlay
  // + caption. Badge uses inline styles — NativeWind arbitrary size/radius
  // classes mis-render on Android. Colors via useRoleColors so the badge flips
  // with the scheme (static light colors froze it orange-on-cream in dark mode).
  if (centered) {
    // Empty state (handoff create-group picker): dashed outline circle with a
    // camera glyph and a PLUS badge until an image is picked; filled state
    // shows the avatar (or initials) with the pencil edit-badge.
    const empty = !value && (fallback ?? '').trim() === '';
    return (
      <View testID={testID} style={{ alignItems: 'center', gap: 8 }}>
        <Touchable
          testID={testID ? `${testID}-pick` : undefined}
          accessibilityLabel={label}
          disabled={disabled}
          onPress={() => void handlePick()}
        >
          <View style={{ position: 'relative' }}>
            {empty ? (
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: color('outline'),
                  backgroundColor: color('surface2'),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ZSymbol name="camera" label="" size={26} color={color('onSurfaceVariant')} />
              </View>
            ) : (
              <ZAvatar image={value} fallback={fallback} alt={alt} size={88} />
            )}
            <View
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 30,
                height: 30,
                borderRadius: 999,
                borderWidth: 2.5,
                borderColor: color('background'),
                backgroundColor: color('accentStrong'),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ZSymbol name={empty ? 'plus' : 'edit'} label="" size={15} color={color('onAccent')} />
            </View>
          </View>
        </Touchable>
        <Text className="text-xs text-z-muted">{label}</Text>
      </View>
    );
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
