import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export type ZStepState = 'completed' | 'active' | 'upcoming';

export type ZStep = {
  label: string;
  state: ZStepState;
};

const circleClasses: Record<ZStepState, string> = {
  completed: 'border-z-primary bg-z-primary',
  active: 'border-z-primary bg-z-surface',
  upcoming: 'border-z-border bg-z-surface opacity-50',
};

const labelClasses: Record<ZStepState, string> = {
  completed: 'text-z-primary',
  active: 'font-semibold text-z-text',
  upcoming: 'text-z-muted',
};

/**
 * Multi-step flow progress. Mobile counterpart of the web `z-stepper`
 * wrapper (web/dashboard-next/src/app/shared/ui/stepper/).
 */
export function ZStepper({
  steps,
  onStepPress,
  testID,
}: {
  steps: ZStep[];
  onStepPress?: (index: number) => void;
  testID?: string;
}) {
  return (
    <View testID={testID} className="flex-row items-start">
      {steps.map((step, index) => {
        const disabled = step.state === 'upcoming';
        return (
          <View key={index} className="flex-row items-start">
            {index > 0 ? (
              <View
                className={`mt-4 h-0.5 flex-1 ${
                  step.state !== 'upcoming' ? 'bg-z-primary' : 'bg-z-border'
                }`}
              />
            ) : null}
            <View className="w-20 items-center gap-1.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={step.label}
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => onStepPress?.(index)}
                className={`h-8 w-8 items-center justify-center rounded-full border-2 ${circleClasses[step.state]}`}
              >
                {step.state === 'completed' ? (
                  <Check color={colors.onPrimary} size={16} />
                ) : (
                  <Text
                    className={
                      step.state === 'active' ? 'font-semibold text-z-primary' : 'text-z-muted'
                    }
                  >
                    {index + 1}
                  </Text>
                )}
              </Pressable>
              <Text className={`text-center text-xs ${labelClasses[step.state]}`}>{step.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
