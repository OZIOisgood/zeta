import { Text, View } from 'react-native';
import { ZButton } from '../../components/ui/z-button';
import { ZScreen } from '../../components/ui/z-screen';
import { authStore, useAuth } from '../../auth/auth-store';

export default function ProfileScreen() {
  const user = useAuth((s) => s.user);

  if (!user) return null;

  return (
    <ZScreen edges={['top']} className="items-center justify-center gap-4 px-8">
      <Text className="text-xl font-semibold text-z-text">
        {user.first_name} {user.last_name}
      </Text>
      <Text className="text-z-muted">{user.email}</Text>
      <Text className="text-z-muted">{user.role}</Text>
      <View className="w-full pt-4">
        <ZButton
          label="Sign out"
          variant="secondary"
          onPress={() => void authStore.getState().signOut()}
        />
      </View>
    </ZScreen>
  );
}
