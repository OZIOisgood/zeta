import { Text, View } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import type { CoachingAvailability } from '../api/queries/coaching';
import { colors } from '../theme/colors';
import { ZCard } from './ui/z-card';
import { ZIconButton } from './ui/z-icon-button';

/**
 * One weekly-schedule row. Mobile counterpart of the web manage-availability
 * schedule <article> (pages/manage-availability, @case('schedule')): weekday
 * name + "start – end", with edit/delete icon-buttons.
 */
export function ScheduleDayRow({
  availability,
  dayName,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  testID,
}: {
  availability: CoachingAvailability;
  dayName: string;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  testID?: string;
}) {
  return (
    <ZCard testID={testID}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-semibold text-z-text">{dayName}</Text>
          <Text className="mt-1 text-sm text-z-muted">
            {`${availability.start_time} – ${availability.end_time}`}
          </Text>
        </View>
        <View className="flex-row shrink-0 gap-2">
          <ZIconButton label={editLabel} variant="secondary" size="sm" onPress={onEdit}>
            <Pencil color={colors.text} size={16} />
          </ZIconButton>
          <ZIconButton label={deleteLabel} variant="secondary" size="sm" onPress={onDelete}>
            <Trash2 color={colors.danger} size={16} />
          </ZIconButton>
        </View>
      </View>
    </ZCard>
  );
}
