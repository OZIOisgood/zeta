import { Image, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupUser } from '../api/queries/groups';
import { avatarSrc } from '../lib/avatar';

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
      <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-z-surface-muted">
        {member.avatar ? (
          <Image
            source={{ uri: avatarSrc(member.avatar) }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View testID="member-initials" className="items-center justify-center">
            <Text className="text-sm font-semibold text-z-text">{initials(member)}</Text>
          </View>
        )}
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-z-text">{fullName}</Text>
        <Text className="text-xs text-z-muted">{roleLabel}</Text>
      </View>
    </View>
  );
}
