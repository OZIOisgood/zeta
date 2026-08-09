import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZStepperProps, ZStepState } from './z-stepper.types';
import { ZSymbol } from './z-symbol';

export type { ZStep, ZStepState, ZStepperProps } from './z-stepper.types';

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
 *
 * Uses `useRoleColors` for the checkmark icon so the color adapts to dark
 * mode (onAccent is white in both schemes, but wired through the role adapter
 * for consistency).
 */
export function ZStepper({ steps, onStepPress, reached, testID }: ZStepperProps) {
  const { color } = useRoleColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}
      contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-start' }}
    >
      {steps.map((step, index) => {
        const disabled = reached != null ? index > reached : step.state === 'upcoming';
        return (
          <View key={index} className="flex-row items-start">
            {index > 0 ? (
              <View
                className={`mt-4 h-0.5 w-8 ${
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
                  // ZSymbol (not lucide): SF Symbols / Material Symbols on
                  // device per the kit's icon mapping; decorative (label="") —
                  // the step's Pressable already announces the label.
                  <ZSymbol name="check" label="" size={16} color={color('onAccent')} />
                ) : (
                  <Text
                    className={`text-sm font-semibold ${
                      step.state === 'active' ? 'text-z-primary' : 'text-z-muted'
                    }`}
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
    </ScrollView>
  );
}
