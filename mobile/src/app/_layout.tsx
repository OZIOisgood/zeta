import '../../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { useRoleColors } from '../theme/native';
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

export default function RootLayout() {
  const status = useAuth((s) => s.status);
  const { color } = useRoleColors();

  /** Scheme-aware header chrome. Built per-render from role tokens — the
   *  static light-only `colors` module froze the header bars light in dark
   *  mode ("Dark mode flips role tokens", handoff). Shared by the detail
   *  screens and the three formSheet routes below. */
  const headerChrome = {
    headerTintColor: color('accent'),
    headerStyle: { backgroundColor: color('background') },
    headerTitleStyle: { color: color('onSurface'), fontFamily: 'NunitoSans_600SemiBold' },
  } as const;

  /** Shared options applied to every detail/form screen that gets a native header.
   *  - headerBackButtonDisplayMode:'minimal' → iOS shows only the chevron, no
   *    label (HIG recommendation for deeper stacks; avoids long dynamic titles
   *    appearing in the back button of a subsequent push).
   *  - headerTintColor: accent for the interactive back chevron/button.
   *  - headerStyle / headerTitleStyle: neutral chrome so only interactive items
   *    carry the accent — not the title itself. */
  const detailScreenOptions = {
    headerShown: true,
    headerBackButtonDisplayMode: 'minimal' as const,
    ...headerChrome,
    // Flat header (no hard divider/drop-shadow) to match the handoff — the header
    // shares the screen's warm bg, so the elevation line reads as a hard seam.
    headerShadowVisible: false,
  } as const;

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
        <ActivityIndicator size="large" color={color('accent')} />
      </View>
    ) : (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(tabs)" />
          {/* Detail / form screens — native header with back + swipe-back.
              Dynamic titles (asset/[id], group/[id]) are set inside the screen
              component via <Stack.Screen options={{ title }} /> once data loads. */}
          <Stack.Screen name="asset/[id]" options={detailScreenOptions} />
          <Stack.Screen name="group/[id]" options={detailScreenOptions} />
          <Stack.Screen name="group/[id]/preferences" options={detailScreenOptions} />
          <Stack.Screen name="group/create" options={detailScreenOptions} />
          <Stack.Screen name="availability" options={detailScreenOptions} />
          <Stack.Screen name="preferences" options={detailScreenOptions} />
          <Stack.Screen name="notifications" options={detailScreenOptions} />
          <Stack.Screen name="reports" options={detailScreenOptions} />
          <Stack.Screen name="select/[field]" options={detailScreenOptions} />
          <Stack.Screen name="invite" options={detailScreenOptions} />
          {/* Modal screens — formSheet gives native grab-bar + detents on iOS
              (UISheetPresentationController) and a bottom sheet on Android.
              headerShown:true lets the screen set its own title + cancel
              button via <Stack.Screen options={...}> inside the component.
              upload: full height (media picker needs room); single detent '1.0'
                so the sheet always expands — no half-sheet for a multi-step wizard
                that embeds a video picker.
              book: full height ('1.0' single detent) — the stepped booking
                wizard pins a persistent bottom CTA bar, and Android does NOT
                reflow the sheet content to a half detent (it lays out at full
                height), so a [0.5,1.0] sheet hides the "Weiter"/"Buchen" button
                below the fold until dragged up. Same reasoning as upload. */}
          <Stack.Screen
            name="upload"
            options={{
              presentation: 'formSheet',
              headerShown: true,
              headerBackButtonDisplayMode: 'minimal' as const,
              ...headerChrome,
              sheetAllowedDetents: [1.0],
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
            }}
          />
          <Stack.Screen
            name="book"
            options={{
              presentation: 'formSheet',
              headerShown: true,
              headerBackButtonDisplayMode: 'minimal' as const,
              ...headerChrome,
              sheetAllowedDetents: [1.0],
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
            }}
          />
          {/* Cancel-session confirm — native formSheet (replaces the broken
              ZConfirmDialog-with-children / Compose ModalBottomSheet path). */}
          <Stack.Screen
            name="cancel/[bookingId]"
            options={{
              presentation: 'formSheet',
              headerShown: true,
              headerBackButtonDisplayMode: 'minimal' as const,
              ...headerChrome,
              sheetAllowedDetents: [0.5, 1.0],
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
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
    // GestureHandlerRootView must wrap the whole app for react-native-gesture-handler
    // (the swipe-to-cancel ZSwipeable on the Sessions list); without it the
    // gesture is silently dead on Android.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {/* Without an explicit style Android keeps light (white) status-bar
            icons over the warm light background — unreadable on every screen.
            "auto" follows the color scheme (dark icons in light mode). */}
        <StatusBar style="auto" />
        {content}
        <ZToastHost />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
