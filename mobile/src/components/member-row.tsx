import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupUser } from '../api/queries/groups';
import { ZAvatar } from './ui/z-avatar';
import { ZBadge } from './ui/z-badge';

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

export function MemberRow({ member }: { member: GroupUser }) {
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
        <Text className="text-xs text-z-muted">{member.email}</Text>
      </View>
    </View>
  );
}
