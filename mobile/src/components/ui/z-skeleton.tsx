import { View } from 'react-native';

export function ZSkeleton({ className = '', testID }: { className?: string; testID?: string }) {
  return <View testID={testID} className={`rounded-md bg-z-surface-muted ${className}`} />;
}
