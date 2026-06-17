import { View } from 'react-native';
import { useRoleColors } from '../theme/native';
import { ZListItem } from './ui/z-list-item';
import { ZSymbol } from './ui/z-symbol';

/**
 * One onboarding checklist row (Material handoff StepItem look) rendered as a
 * ZListItem tile — a rounded row that fills with the tonal secondary-container
 * (via ZListItem's `selected`) once the step is completed, without dimming. The
 * status indicator is the custom leading node — a 24px circle: done = filled
 * accent + a 14px white check (native ZSymbol); todo = a 2px outline-strong
 * ring. The trailing chevron shows only while incomplete.
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
  const leading = completed ? (
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
    <ZListItem
      testID={testID}
      leading={leading}
      title={label}
      subtitle={description}
      onPress={onPress}
      selected={completed}
      trailing={
        !completed ? (
          <ZSymbol
            testID="first-step-row-chevron"
            name="chevron-right"
            label=""
            size={18}
            color={color('onSurfaceVariant')}
          />
        ) : undefined
      }
    />
  );
}
