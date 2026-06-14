import { View } from 'react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { Decorator } from '@storybook/react';

const MOCK_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export const withProviders: Decorator = (Story) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider initialMetrics={MOCK_METRICS}>
      <View className="flex-1 bg-z-bg p-4">
        <Story />
      </View>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);
