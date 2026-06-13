import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Group } from '../api/queries/groups';
import { initialsFromName } from '../lib/avatar';
import { ZAvatar } from './ui/z-avatar';

export function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={group.name}
      onPress={onPress}
      className="mb-3 flex-row items-center gap-3 rounded-lg border border-z-border bg-z-surface p-3 active:bg-z-surface-warm"
    >
      <ZAvatar
        image={group.avatar ?? undefined}
        fallback={initialsFromName(group.name)}
        alt={group.name}
        size={48}
        testID={group.avatar ? undefined : 'group-avatar-fallback'}
      />
      <View className="flex-1 gap-1">
        <Text numberOfLines={1} className="text-base font-semibold text-z-text">
          {group.name}
        </Text>
        <Text numberOfLines={2} className="text-sm text-z-muted">
          {group.description ? group.description : t('groups.phase4.noDescription')}
        </Text>
      </View>
    </Pressable>
  );
}
