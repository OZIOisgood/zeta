import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
import { ZScreen } from './z-screen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

test('pads content by the safe-area insets', async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ZScreen testID="screen">
        <Text>content</Text>
      </ZScreen>
    </SafeAreaProvider>,
  );
  expect(screen.getByTestId('screen')).toHaveStyle({ paddingTop: 59, paddingBottom: 34 });
  expect(screen.getByText('content')).toBeOnTheScreen();
});

test('skips edges that are not requested', async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ZScreen testID="screen" edges={['top']}>
        <Text>content</Text>
      </ZScreen>
    </SafeAreaProvider>,
  );
  expect(screen.getByTestId('screen')).toHaveStyle({ paddingTop: 59, paddingBottom: 0 });
});

test('applies no vertical insets when edges is empty (tab screens with native header + NativeTabs)', async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ZScreen testID="screen" edges={[]}>
        <Text>content</Text>
      </ZScreen>
    </SafeAreaProvider>,
  );
  expect(screen.getByTestId('screen')).toHaveStyle({ paddingTop: 0, paddingBottom: 0 });
});
