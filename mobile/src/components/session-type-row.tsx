import { Pencil, Trash2 } from 'lucide-react-native';
import type { SessionType } from '../api/queries/coaching';
import { colors } from '../theme/colors';
import { ZBadge } from './ui/z-badge';
import { ZIconButton } from './ui/z-icon-button';
import { ZListItem } from './ui/z-list-item';

/**
 * One session-type row. Mobile counterpart of the web manage-availability
 * session-type <article> (pages/manage-availability, @case('session-types')):
 * name + duration badge + description, with edit/delete icon-buttons.
 *
 * Each row is its own tonal tile (the screen's FlatList renders them with a gap),
 * so ZListItem's own `bg-surface` rounded tile preserves the separate-card
 * grouping — no enclosing ZCard needed.
 */
export function SessionTypeRow({
  sessionType,
  durationLabel,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  testID,
}: {
  sessionType: SessionType;
  durationLabel: string;
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
      title={sessionType.name}
      titleAccessory={<ZBadge label={durationLabel} />}
      subtitle={sessionType.description ? sessionType.description : undefined}
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
