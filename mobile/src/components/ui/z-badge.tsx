import { Text, View } from 'react-native';

export type ZBadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const containerClasses: Record<ZBadgeTone, string> = {
  neutral: 'border-z-border bg-z-surface',
  primary: 'border-z-primary-soft bg-z-primary-soft',
  success: 'border-green-200 bg-green-50',
  warning: 'border-amber-200 bg-amber-50',
  danger: 'border-rose-200 bg-rose-50',
};

const labelClasses: Record<ZBadgeTone, string> = {
  neutral: 'text-z-muted',
  primary: 'text-z-primary-strong',
  success: 'text-z-success',
  warning: 'text-z-warning',
  danger: 'text-z-danger',
};

/**
 * Status pill / count badge. Mobile counterpart of the web `z-badge`
 * wrapper (web/dashboard-next/src/app/shared/ui/badge/).
 */
export function ZBadge({
  label,
  tone = 'neutral',
  testID,
}: {
  label: string;
  tone?: ZBadgeTone;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      className={`self-start rounded-md border px-2 py-1 ${containerClasses[tone]}`}
    >
      <Text className={`text-xs font-semibold ${labelClasses[tone]}`}>{label}</Text>
    </View>
  );
}
