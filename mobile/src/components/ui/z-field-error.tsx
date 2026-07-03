import { CircleAlert } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useRoleColors } from '../../theme/native';

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
  const { color } = useRoleColors();
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      className="mt-1 flex-row items-start gap-1.5"
    >
      <CircleAlert color={color('danger')} size={14} />
      <Text className="flex-1 text-xs font-medium text-z-danger">{message}</Text>
    </View>
  );
}
