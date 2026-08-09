import type { SessionType } from '../api/queries/coaching';
import { useScreenReader } from '../lib/use-screen-reader';
import { useRoleColors } from '../theme/native';
import { ZBadge } from './ui/z-badge';
import { ZIconButton } from './ui/z-icon-button';
import { ZListItem } from './ui/z-list-item';
import { ZSwipeable } from './ui/z-swipeable';
import { ZSymbol } from './ui/z-symbol';

/**
 * One session-type row: name + duration badge + description.
 *
 * Interaction is the platform list idiom (deliberate SOTA override of the
 * handoff mock, which drew pencil/trash icon buttons — a desktop affordance):
 * TAP the row to edit, SWIPE to reveal delete. Under a screen reader the swipe
 * action is unreachable, so an explicit delete button renders instead (same
 * pattern as booking-card).
 */
export function SessionTypeRow({
  sessionType,
  durationLabel,
  deleteLabel,
  onEdit,
  onDelete,
  testID,
}: {
  sessionType: SessionType;
  durationLabel: string;
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
      title={sessionType.name}
      titleAccessory={<ZBadge label={durationLabel} />}
      subtitle={sessionType.description ? sessionType.description : undefined}
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
