import { Pressable, Text, View } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { colors } from '../theme/colors';

/**
 * One onboarding checklist row. Mobile counterpart of the web home page
 * first-steps item (pages/home/home-page.component.ts): a tappable row with a
 * completion glyph, a label, and a muted description. Completed rows are dimmed.
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
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ checked: completed }}
      onPress={onPress}
      className={`flex-row items-start gap-3 rounded-md border border-z-border bg-z-surface p-3 active:bg-z-surface-warm${completed ? ' opacity-60' : ''}`}
    >
      <View className="mt-0.5">
        {completed ? (
          <CheckCircle2 color={colors.primary} size={18} />
        ) : (
          <Circle color={colors.muted} size={18} />
        )}
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-sm font-semibold text-z-text">{label}</Text>
        <Text className="text-xs leading-5 text-z-muted">{description}</Text>
      </View>
    </Pressable>
  );
}
