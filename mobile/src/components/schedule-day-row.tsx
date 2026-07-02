import { Pencil, Trash2 } from 'lucide-react-native';
import type { CoachingAvailability } from '../api/queries/coaching';
import { useRoleColors } from '../theme/native';
import { ZIconButton } from './ui/z-icon-button';
import { ZIconTile } from './ui/z-icon-tile';
import { ZListItem } from './ui/z-list-item';
import { ZSymbol } from './ui/z-symbol';

/**
 * One weekly-schedule row. Mobile counterpart of the web manage-availability
 * schedule <article> (pages/manage-availability, @case('schedule')): a leading
 * calendar IconTile + weekday name + "start – end", with edit/delete
 * icon-buttons.
 *
 * The screen groups these rows inside a single ZCard with hairline ZDividers
 * (the inset-grouped pattern), matching the Material handoff (screens3.jsx).
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
  const { color } = useRoleColors();
  return (
    <ZListItem
      // Non-interactive: the row surfaces its own edit/delete controls.
      testID={testID}
      leading={
        <ZIconTile
          tone="neutral"
          size="sm"
          icon={<ZSymbol name="calendar" label={dayName} size={18} color={color('accentStrong')} />}
        />
      }
      title={dayName}
      subtitle={`${availability.start_time} – ${availability.end_time}`}
      trailing={
        <>
          <ZIconButton label={editLabel} variant="secondary" size="sm" onPress={onEdit}>
            <Pencil color={color('onSurface')} size={16} />
          </ZIconButton>
          <ZIconButton label={deleteLabel} variant="secondary" size="sm" onPress={onDelete}>
            <Trash2 color={color('danger')} size={16} />
          </ZIconButton>
        </>
      }
    />
  );
}
