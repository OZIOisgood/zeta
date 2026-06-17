import { Pencil, Trash2 } from 'lucide-react-native';
import type { CoachingAvailability } from '../api/queries/coaching';
import { colors } from '../theme/colors';
import { ZIconButton } from './ui/z-icon-button';
import { ZListItem } from './ui/z-list-item';

/**
 * One weekly-schedule row. Mobile counterpart of the web manage-availability
 * schedule <article> (pages/manage-availability, @case('schedule')): weekday
 * name + "start – end", with edit/delete icon-buttons.
 *
 * Each row is its own tonal tile (the screen's FlatList renders them with a gap),
 * so ZListItem's own `bg-surface` rounded tile preserves the separate-card
 * grouping — no enclosing ZCard needed.
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
    <ZListItem
      // Non-interactive: the row surfaces its own edit/delete controls.
      testID={testID}
      title={dayName}
      subtitle={`${availability.start_time} – ${availability.end_time}`}
      trailing={
        <>
          <ZIconButton label={editLabel} variant="secondary" size="sm" onPress={onEdit}>
            <Pencil color={colors.text} size={16} />
          </ZIconButton>
          <ZIconButton label={deleteLabel} variant="secondary" size="sm" onPress={onDelete}>
            <Trash2 color={colors.danger} size={16} />
          </ZIconButton>
        </>
      }
    />
  );
}
