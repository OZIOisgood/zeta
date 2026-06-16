import { Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { Touchable } from './ui/touchable';
import { ZSymbol } from './ui/z-symbol';

/**
 * One onboarding checklist row. Mobile counterpart of the web home page
 * first-steps item (pages/home/home-page.component.ts): a tappable row with a
 * completion glyph, a label, and a muted description. Completed rows are NOT
 * dimmed — done shows a vivid filled accent `check-circle`; a todo shows an
 * outline `circle` plus a trailing chevron.
 *
 * Material-handoff look (design_handoff_home_videos/material-home.jsx StepItem):
 * borderless divider rows — the parent list draws hairline dividers between
 * rows, so the row itself has no border/box. Uses Touchable + ZSymbol (SF
 * Symbols on iOS / Material Symbols on Android) per the Native-fidelity rules.
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
          <ZSymbol
            testID="first-step-row-check"
            name="check-circle"
            label=""
            size={22}
            color={colors.primary}
          />
        ) : (
          <ZSymbol
            testID="first-step-row-circle"
            name="circle"
            label=""
            size={22}
            color={colors.muted}
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
            color={colors.muted}
          />
        </View>
      ) : null}
    </Touchable>
  );
}
