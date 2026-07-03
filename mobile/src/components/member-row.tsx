import { useTranslation } from 'react-i18next';
import type { GroupUser } from '../api/queries/groups';
import { useScreenReader } from '../lib/use-screen-reader';
import { useRoleColors } from '../theme/native';
import { ZAvatar } from './ui/z-avatar';
import { ZIconButton } from './ui/z-icon-button';
import { ZListItem } from './ui/z-list-item';
import { ZSwipeable } from './ui/z-swipeable';
import { ZSymbol } from './ui/z-symbol';

function initials(member: GroupUser): string {
  const first = member.first_name.charAt(0).toUpperCase();
  const last = member.last_name.charAt(0).toUpperCase();
  return `${first}${last}`;
}

/**
 * One group-member row. Removal (perm-gated) follows the platform list idiom:
 * SWIPE to reveal the remove action; explicit button under a screen reader
 * (see session-type-row / booking-card). The row itself is non-interactive —
 * there is no member detail screen.
 */
export function MemberRow({
  member,
  onRemove,
}: {
  member: GroupUser;
  /** When provided, renders a perm-gated remove action that calls back with no args. */
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const { color } = useRoleColors();
  const screenReaderOn = useScreenReader();
  const fullName = `${member.first_name} ${member.last_name}`.trim();

  const row = (
    <ZListItem
      leading={
        <ZAvatar
          image={member.avatar}
          fallback={initials(member)}
          size={44}
          shape="circle"
          alt={fullName}
          testID={member.avatar ? undefined : 'member-initials'}
        />
      }
      title={fullName}
      subtitle={member.email}
      trailing={
        onRemove && screenReaderOn ? (
          <ZIconButton
            testID="member-remove"
            label={t('groups.users.removeUser')}
            variant="ghost"
            size="sm"
            onPress={onRemove}
          >
            <ZSymbol name="trash" label={t('groups.users.removeUser')} size={18} color={color('danger')} />
          </ZIconButton>
        ) : undefined
      }
    />
  );

  if (!onRemove || screenReaderOn) return row;
  return (
    <ZSwipeable
      testID="member-remove-swipe"
      actionLabel={t('groups.users.removeUser')}
      actionIcon={<ZSymbol name="trash" label="" size={20} color={color('onAccent')} />}
      onAction={onRemove}
    >
      {row}
    </ZSwipeable>
  );
}
