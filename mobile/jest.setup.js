/* eslint-env jest */
// Default mock for safe-area insets so screens using ZScreen render in tests
// without a SafeAreaProvider. The mocked provider still honors
// `initialMetrics`, so tests can opt into real inset values.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
