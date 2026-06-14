import { Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { GroupUser } from '../api/queries/groups';
import { ZAvatar } from './ui/z-avatar';
import { ZBadge } from './ui/z-badge';
import { ZIconButton } from './ui/z-icon-button';
import { colors } from '../theme/colors';

function initials(member: GroupUser): string {
  const first = member.first_name.charAt(0).toUpperCase();
  const last = member.last_name.charAt(0).toUpperCase();
  return `${first}${last}`;
}

const ROLE_KEYS: Record<string, string> = {
  admin: 'groups.roles.admin',
  expert: 'groups.roles.expert',
  student: 'groups.roles.student',
};

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
  const roleKey = ROLE_KEYS[member.role];
  const roleLabel = roleKey ? t(roleKey) : member.role;
  return (
    <View className="flex-row items-center gap-3 py-2">
      <ZAvatar
        image={member.avatar}
        fallback={initials(member)}
        size={44}
        shape="circle"
        alt={fullName}
        testID={member.avatar ? undefined : 'member-initials'}
      />
      <View className="flex-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-sm font-semibold text-z-text">{fullName}</Text>
          <ZBadge label={roleLabel} tone="primary" />
        </View>
        <Text className="text-sm text-z-muted">{member.email}</Text>
      </View>
      {onRemove ? (
        <ZIconButton
          testID="member-remove"
          label={t('groups.users.removeUser')}
          variant="ghost"
          size="sm"
          onPress={onRemove}
        >
          <Trash2 color={colors.danger} size={18} />
        </ZIconButton>
      ) : null}
    </View>
  );
}
