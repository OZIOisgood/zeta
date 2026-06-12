import { Image, Text, View } from 'react-native';
import type { GroupUser } from '../api/queries/groups';

function avatarSrc(avatar: string): string {
  return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
}

function initials(member: GroupUser): string {
  const first = member.first_name.charAt(0).toUpperCase();
  const last = member.last_name.charAt(0).toUpperCase();
  return `${first}${last}`;
}

export function MemberRow({ member }: { member: GroupUser }) {
  const fullName = `${member.first_name} ${member.last_name}`.trim();
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
        <Text className="text-xs text-z-muted">{member.role}</Text>
      </View>
    </View>
  );
}
