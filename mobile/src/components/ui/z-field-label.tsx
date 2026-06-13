import { Text } from 'react-native';

/**
 * Form field label. Mobile counterpart of the web `z-field-label`
 * wrapper (web/dashboard-next/src/app/shared/ui/field-label/).
 */
export function ZFieldLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <Text className="mb-1 text-sm font-semibold text-z-text">
      {label}
      {required ? <Text className="text-z-primary"> *</Text> : null}
    </Text>
  );
}
