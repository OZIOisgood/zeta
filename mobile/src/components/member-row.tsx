import { Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { GroupUser } from '../api/queries/groups';
import { ZAvatar } from './ui/z-avatar';
import { ZIconButton } from './ui/z-icon-button';
import { ZListItem } from './ui/z-list-item';
import { colors } from '../theme/colors';

function initials(member: GroupUser): string {
  const first = member.first_name.charAt(0).toUpperCase();
  const last = member.last_name.charAt(0).toUpperCase();
  return `${first}${last}`;
}

export function MemberRow({
  member,
  onRemove,
}: {
  member: GroupUser;
  /** When provided, renders a perm-gated remove action that calls back with no args. */
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const fullName = `${member.first_name} ${member.last_name}`.trim();
  return (
    <ZListItem
      // Non-interactive: the row surfaces its own remove control, so it must not
      // pose as a button — omit onPress.
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
        onRemove ? (
          <ZIconButton
            testID="member-remove"
            label={t('groups.users.removeUser')}
            variant="ghost"
            size="sm"
            onPress={onRemove}
          >
            <Trash2 color={colors.danger} size={18} />
          </ZIconButton>
        ) : undefined
      }
    />
  );
}
