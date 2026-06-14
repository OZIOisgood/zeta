import { Text, View } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import type { SessionType } from '../api/queries/coaching';
import { colors } from '../theme/colors';
import { ZBadge } from './ui/z-badge';
import { ZCard } from './ui/z-card';
import { ZIconButton } from './ui/z-icon-button';

/**
 * One session-type row. Mobile counterpart of the web manage-availability
 * session-type <article> (pages/manage-availability, @case('session-types')):
 * name + duration badge + description, with edit/delete icon-buttons.
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
    <ZCard testID={testID}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="font-semibold text-z-text">{sessionType.name}</Text>
            <ZBadge label={durationLabel} />
          </View>
          {sessionType.description ? (
            <Text numberOfLines={3} className="mt-2 text-sm leading-6 text-z-muted">
              {sessionType.description}
            </Text>
          ) : null}
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
