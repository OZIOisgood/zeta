import { CircleAlert } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Validation error text under a field. Mobile counterpart of the web
 * `z-field-error` wrapper (web/dashboard-next/src/app/shared/ui/field-error/).
 */
export function ZFieldError({
  message,
  testID,
}: {
  message: string;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      className="mt-1 flex-row items-start gap-1.5"
    >
      <CircleAlert color={colors.danger} size={14} />
      <Text className="flex-1 text-xs font-medium text-z-danger">{message}</Text>
    </View>
  );
}
