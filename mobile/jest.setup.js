/* eslint-env jest */
// Default mock for safe-area insets so screens using ZScreen render in tests
// without a SafeAreaProvider. The mocked provider still honors
// `initialMetrics`, so tests can opt into real inset values.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// Brand font (Nunito Sans). The real faces are bundled native assets that jest
// can't load, and useFonts() resolves async — which would otherwise leave the
// root layout stuck on its splash/loading branch. Mock useFonts to report the
// font as loaded synchronously, and expose the face constants the layout
// imports. The faces themselves are irrelevant to the (web-fallback) render.
jest.mock('@expo-google-fonts/nunito-sans', () => ({
  useFonts: () => [true, null],
  NunitoSans_400Regular: 'NunitoSans_400Regular',
  NunitoSans_500Medium: 'NunitoSans_500Medium',
  NunitoSans_600SemiBold: 'NunitoSans_600SemiBold',
  NunitoSans_700Bold: 'NunitoSans_700Bold',
  NunitoSans_800ExtraBold: 'NunitoSans_800ExtraBold',
}));
