import { Text, View } from 'react-native';

/**
 * Form field label. Mobile counterpart of the web `z-field-label`
 * wrapper (web/dashboard-next/src/app/shared/ui/field-label/).
 *
 * `hint` renders muted, right-aligned on the label line — the handoff marks
 * OPTIONAL fields via hint (e.g. "Optional") instead of starring required
 * ones. `required` (asterisk) remains supported but the handoff convention
 * is hint-based; prefer `hint` in new forms.
 */
export function ZFieldLabel({
  label,
  required = false,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
}) {
  if (hint) {
    return (
      <View className="mb-1.5 flex-row items-baseline justify-between">
        <Text className="text-[13px] font-bold text-z-text">
          {label}
          {required ? <Text className="text-z-primary"> *</Text> : null}
        </Text>
        <Text className="text-[12px] text-z-muted">{hint}</Text>
      </View>
    );
  }
  return (
    <Text className="mb-1.5 text-[13px] font-bold text-z-text">
      {label}
      {required ? <Text className="text-z-primary"> *</Text> : null}
    </Text>
  );
}
