import { useTranslation } from 'react-i18next';
import type { Group } from '../api/queries/groups';
import { initialsFromName } from '../lib/avatar';
import { useRoleColors } from '../theme/native';
import { ZAvatar } from './ui/z-avatar';
import { ZListItem } from './ui/z-list-item';
import { ZSymbol } from './ui/z-symbol';

/**
 * One group row (mock: avatar 44 + name + meta + trailing chevron).
 *
 * Subtitle deviation from the mock, documented: the mock shows "N Mitglieder",
 * but the Group schema exposes no member_count — the description (web parity)
 * stands in until the backend adds the field. Spacing/grouping (Android tile
 * gap vs iOS inset-grouped card) is owned by the list, not the row.
 */
export function GroupCard({
  group,
  onPress,
  className,
}: {
  group: Group;
  onPress: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const { color } = useRoleColors();
  return (
    <ZListItem
      className={className}
      onPress={onPress}
      leading={
        <ZAvatar
          image={group.avatar ?? undefined}
          fallback={initialsFromName(group.name)}
          alt={group.name}
          size={44}
          testID={group.avatar ? undefined : 'group-avatar-fallback'}
        />
      }
      title={group.name}
      subtitle={group.description ? group.description : t('groups.phase4.noDescription')}
      trailing={<ZSymbol name="chevron-right" label="" size={18} color={color('onSurfaceVariant')} />}
    />
  );
}
