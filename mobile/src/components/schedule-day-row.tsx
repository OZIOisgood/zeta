import type { CoachingAvailability } from '../api/queries/coaching';
import { useScreenReader } from '../lib/use-screen-reader';
import { useRoleColors } from '../theme/native';
import { ZIconButton } from './ui/z-icon-button';
import { ZIconTile } from './ui/z-icon-tile';
import { ZListItem } from './ui/z-list-item';
import { ZSwipeable } from './ui/z-swipeable';
import { ZSymbol } from './ui/z-symbol';

/**
 * One weekly-schedule row: leading calendar IconTile + weekday + "start – end".
 *
 * Interaction is the platform list idiom (deliberate SOTA override of the
 * handoff mock's pencil/trash icon buttons): TAP the row to edit, SWIPE to
 * reveal delete; explicit delete button under a screen reader (see
 * session-type-row / booking-card).
 */
export function ScheduleDayRow({
  availability,
  dayName,
  deleteLabel,
  onEdit,
  onDelete,
  testID,
}: {
  availability: CoachingAvailability;
  dayName: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  testID?: string;
}) {
  const { color } = useRoleColors();
  const screenReaderOn = useScreenReader();

  const row = (
    <ZListItem
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
      onPress={onEdit}
      trailing={
        screenReaderOn ? (
          <ZIconButton label={deleteLabel} variant="secondary" size="sm" onPress={onDelete}>
            <ZSymbol name="trash" label={deleteLabel} size={16} color={color('danger')} />
          </ZIconButton>
        ) : (
          <ZSymbol name="chevron-right" label="" size={18} color={color('onSurfaceVariant')} />
        )
      }
    />
  );

  if (screenReaderOn) return row;
  return (
    <ZSwipeable
      testID={testID ? `${testID}-swipe` : undefined}
      actionLabel={deleteLabel}
      actionIcon={<ZSymbol name="trash" label="" size={20} color={color('onDanger')} />}
      onAction={onDelete}
    >
      {row}
    </ZSwipeable>
  );
}
