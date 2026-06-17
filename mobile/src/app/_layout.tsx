import '../../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from '@expo-google-fonts/nunito-sans';
import { initI18n } from '../i18n';
import { authStore, useAuth } from '../auth/auth-store';
import { queryClient } from '../api/query-client';
import { colors } from '../theme/colors';
import { ZToastHost } from '../components/ui/z-toast';

void initI18n();

// App-wide brand font (Nunito Sans). We patch Text.render — NOT
// Text.defaultProps (React 19 no longer honors defaultProps on function
// components) and NOT a CSS `@layer` rule (NativeWind v4 compiles the weight
// utilities to `fontWeight` only on native, never the font-family). Without
// this, every native <Text> silently falls back to the system font (Roboto) on
// device while jest — which renders the bare web fallback — stays green. Android
// cannot synthesize a weighted cut from one family, so each rendered weight is
// mapped to its own loaded face name. An explicit `fontFamily` already present
// on the style is respected (e.g. native primitives that set their own face).
const WEIGHT_FACE: Record<string, string> = {
  '100': 'NunitoSans_400Regular',
  '200': 'NunitoSans_400Regular',
  '300': 'NunitoSans_400Regular',
  '400': 'NunitoSans_400Regular',
  normal: 'NunitoSans_400Regular',
  '500': 'NunitoSans_500Medium',
  '600': 'NunitoSans_600SemiBold',
  '700': 'NunitoSans_700Bold',
  bold: 'NunitoSans_700Bold',
  '800': 'NunitoSans_800ExtraBold',
  '900': 'NunitoSans_800ExtraBold',
};
type PatchableTextProps = { style?: StyleProp<TextStyle> };
const PatchableText = Text as unknown as {
  render?: (props: PatchableTextProps, ref: unknown) => unknown;
  __zetaFontPatched?: boolean;
};
if (typeof PatchableText.render === 'function' && !PatchableText.__zetaFontPatched) {
  const baseRender = PatchableText.render;
  PatchableText.render = function (props: PatchableTextProps, ref: unknown) {
    const flat = StyleSheet.flatten(props?.style);
    if (!flat?.fontFamily) {
      const weight = String(flat?.fontWeight ?? '400');
      const face = WEIGHT_FACE[weight] ?? 'NunitoSans_400Regular';
      props = { ...props, style: [{ fontFamily: face }, props?.style] };
    }
    return baseRender.call(this, props, ref);
  };
  PatchableText.__zetaFontPatched = true;
}

/** Shared options applied to every detail/form screen that gets a native header.
 *  - headerBackButtonDisplayMode:'minimal' → iOS shows only the chevron, no
 *    label (HIG recommendation for deeper stacks; avoids long dynamic titles
 *    appearing in the back button of a subsequent push).
 *  - headerTintColor: accent orange for the interactive back chevron/button.
 *  - headerStyle / headerTitleStyle: neutral chrome so only interactive items
 *    carry the accent — not the title itself. */
const DETAIL_SCREEN_OPTIONS = {
  headerShown: true,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerTintColor: colors.primary,
  headerStyle: { backgroundColor: colors.bg },
  headerTitleStyle: { color: colors.text, fontFamily: 'NunitoSans_600SemiBold' },
} as const;

export default function RootLayout() {
  const status = useAuth((s) => s.status);

  // Brand font (Nunito Sans). The real per-weight faces are required because
  // RN — notably Android — will NOT synthesize the correct cut from a single
  // family + fontWeight; each weight needs its own face name. The weight
  // utilities (font-normal/medium/semibold/bold/extrabold) are mapped to these
  // faces in global.css. Loaded at runtime via JS-imported faces + useFonts —
  // no native rebuild needed.
  const [fontsLoaded, fontError] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });

  useEffect(() => {
    void authStore.getState().restore();
  }, []);

  // Keep the splash spinner up until both the brand font and the persisted
  // session are ready, so text never flashes in the system font first. If the
  // font fails to load (fontError), proceed anyway with the system fallback —
  // never hang the splash forever on a font error.
  const content =
    (!fontsLoaded && !fontError) || status === 'loading' ? (
      <View className="flex-1 items-center justify-center bg-z-bg">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    ) : (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(tabs)" />
          {/* Detail / form screens — native header with back + swipe-back.
              Dynamic titles (asset/[id], group/[id]) are set inside the screen
              component via <Stack.Screen options={{ title }} /> once data loads. */}
          <Stack.Screen name="asset/[id]" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="group/[id]" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="group/[id]/preferences" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="group/create" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="availability" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="preferences" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="notifications" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="reports" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="select/[field]" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="invite" options={DETAIL_SCREEN_OPTIONS} />
          {/* Modal screens — formSheet gives native grab-bar + detents on iOS
              (UISheetPresentationController) and a bottom sheet on Android.
              headerShown:true lets the screen set its own title + cancel
              button via <Stack.Screen options={...}> inside the component.
              upload: full height (media picker needs room); single detent '1.0'
                so the sheet always expands — no half-sheet for a multi-step wizard
                that embeds a video picker.
              book: half-or-full fluid detents so the user can see the coaching
                calendar below when the sheet is partially open (UX improvement
                over a full-screen push). */}
          <Stack.Screen
            name="upload"
            options={{
              presentation: 'formSheet',
              headerShown: true,
              headerBackButtonDisplayMode: 'minimal' as const,
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.bg },
              headerTitleStyle: { color: colors.text, fontFamily: 'NunitoSans_600SemiBold' },
              sheetAllowedDetents: [1.0],
              sheetGrabberVisible: true,
              sheetCornerRadius: 16,
            }}
          />
          <Stack.Screen
            name="book"
            options={{
              presentation: 'formSheet',
              headerShown: true,
              headerBackButtonDisplayMode: 'minimal' as const,
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.bg },
              headerTitleStyle: { color: colors.text, fontFamily: 'NunitoSans_600SemiBold' },
              sheetAllowedDetents: [0.5, 1.0],
              sheetGrabberVisible: true,
              sheetCornerRadius: 16,
            }}
          />
          {/* Full-screen live call — keeps its own chrome, no nav header. */}
          <Stack.Screen name="call/[bookingId]" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={status !== 'signedIn'}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    );

  return (
    <QueryClientProvider client={queryClient}>
      {content}
      <ZToastHost />
    </QueryClientProvider>
  );
}
