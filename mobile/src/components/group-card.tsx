import { useTranslation } from 'react-i18next';
import type { Group } from '../api/queries/groups';
import { initialsFromName } from '../lib/avatar';
import { ZAvatar } from './ui/z-avatar';
import { ZListItem } from './ui/z-list-item';

export function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <ZListItem
      // Interactive: pressing the row navigates to the group detail screen.
      // mb-1.5 (6dp) carries the inter-card spacing the list relies on (no
      // FlatList separator) on the tonal ZListItem tile, matching the handoff's
      // tighter ~6dp inter-card gap.
      className="mb-1.5"
      onPress={onPress}
      leading={
        <ZAvatar
          image={group.avatar ?? undefined}
          fallback={initialsFromName(group.name)}
          alt={group.name}
          size={48}
          testID={group.avatar ? undefined : 'group-avatar-fallback'}
        />
      }
      title={group.name}
      subtitle={group.description ? group.description : t('groups.phase4.noDescription')}
    />
  );
}
