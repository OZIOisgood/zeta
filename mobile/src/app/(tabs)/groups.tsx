import { Text } from 'react-native';
import { ZScreen } from '../../components/ui/z-screen';

export default function GroupsScreen() {
  return (
    <ZScreen edges={['top']} className="items-center justify-center">
      <Text className="text-lg font-semibold text-z-text">Groups</Text>
    </ZScreen>
  );
}
