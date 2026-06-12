import { Text } from 'react-native';
import { ZScreen } from '../../components/ui/z-screen';

export default function CoachingScreen() {
  return (
    <ZScreen edges={['top']} className="items-center justify-center">
      <Text className="text-lg font-semibold text-z-text">Coaching</Text>
    </ZScreen>
  );
}
