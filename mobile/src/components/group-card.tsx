import { Image, Pressable, Text, View } from 'react-native';
import { Users } from 'lucide-react-native';
import type { Group } from '../api/queries/groups';
import { avatarSrc } from '../lib/avatar';
import { colors } from '../theme/colors';

export function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={group.name}
      onPress={onPress}
      className="mb-3 flex-row items-center gap-3 rounded-lg border border-z-border bg-z-surface p-3 active:bg-z-surface-warm"
    >
      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-z-surface-warm">
        {group.avatar ? (
          <Image
            source={{ uri: avatarSrc(group.avatar) }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View testID="group-avatar-fallback" className="items-center justify-center">
            <Users color={colors.primary} size={24} />
          </View>
        )}
      </View>
      <View className="flex-1 gap-1">
        <Text numberOfLines={1} className="text-base font-semibold text-z-text">
          {group.name}
        </Text>
        {group.description ? (
          <Text numberOfLines={1} className="text-sm text-z-muted">
            {group.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
