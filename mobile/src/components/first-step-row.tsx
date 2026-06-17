import { Text, View } from 'react-native';
import { useRoleColors } from '../theme/native';
import { Touchable } from './ui/touchable';
import { ZSymbol } from './ui/z-symbol';

/**
 * One onboarding checklist row (handoff StepRow look) rendered as a PLAIN
 * pressable row — leading 24px status circle · (title + description) column ·
 * trailing chevron — NOT a ZListItem tile. There is no rounded surface and no
 * tonal/accent fill on the completed row; the hairline separation between rows
 * comes from the `<ZDivider/>` the StepsCard renders between them.
 *
 * Status indicator: done = filled accent circle + a 14px white check (native
 * ZSymbol); todo = a 2px outline ring. The title mutes once completed; the
 * trailing chevron shows only while incomplete.
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
  const statusCircle = completed ? (
    <View
      testID="first-step-row-check"
      className="h-6 w-6 items-center justify-center rounded-full"
      style={{ backgroundColor: color('accent') }}
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
      style={{ borderWidth: 2, borderColor: color('outline') }}
    />
  );

  return (
    <Touchable
      testID={testID}
      onPress={onPress}
      accessibilityLabel={label}
      selected={completed}
      className="flex-row items-start gap-3 py-3"
    >
      <View className="mt-px shrink-0">{statusCircle}</View>
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className={`text-[15px] font-bold ${completed ? 'text-z-muted' : 'text-z-text'}`}
        >
          {label}
        </Text>
        <Text numberOfLines={2} className="mt-0.5 text-[13px] text-z-muted">
          {description}
        </Text>
      </View>
      {!completed ? (
        <View className="mt-px shrink-0">
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
