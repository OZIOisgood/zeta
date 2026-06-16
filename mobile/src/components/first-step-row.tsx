import { Text, View } from 'react-native';
import { useRoleColors } from '../theme/native';
import { Touchable } from './ui/touchable';
import { ZSymbol } from './ui/z-symbol';

/**
 * One onboarding checklist row (Material handoff StepItem look): a borderless
 * divider row (the parent list draws hairline dividers). The status indicator is
 * a 24px circle — done: filled accent + a 14px white check (native ZSymbol);
 * todo: a 2px outline-strong ring. Completed rows are NOT dimmed.
 */
export function FirstStepRow({
  label,
  description,
  completed,
  onPress,
  testID,
}: {
  label: string;
  description: string;
  completed: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { color } = useRoleColors();
  return (
    <Touchable
      testID={testID}
      accessibilityLabel={label}
      selected={completed}
      onPress={onPress}
      haptic
      className="flex-row items-start gap-3 py-3"
    >
      <View className="mt-0.5">
        {completed ? (
          <View
            testID="first-step-row-check"
            className="h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: color('accentStrong') }}
          >
            <ZSymbol
              testID="first-step-row-check-glyph"
              name="check"
              label=""
              size={14}
              color={color('onAccent')}
            />
          </View>
        ) : (
          <View
            testID="first-step-row-circle"
            className="h-6 w-6 rounded-full"
            style={{ borderWidth: 2, borderColor: color('outlineStrong') }}
          />
        )}
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-[14.5px] font-bold text-z-text">{label}</Text>
        <Text className="text-[13px] leading-5 text-z-muted">{description}</Text>
      </View>
      {!completed ? (
        <View className="mt-0.5">
          <ZSymbol
            testID="first-step-row-chevron"
            name="chevron-right"
            label=""
            size={18}
            color={color('onSurfaceVariant')}
          />
        </View>
      ) : null}
    </Touchable>
  );
}
