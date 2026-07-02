// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/__tests__/**'],
    rules: {
      'import/first': 'off',
    },
  },
  // ── Architecture guardrails ──────────────────────────────────────────────────
  //
  // src/app/** screens must not import raw react-native Pressable/Modal/
  // TouchableOpacity/TouchableHighlight, @expo/ui, or lucide-react-native.
  // Those live only in src/components/ui/** z-* primitives.
  //
  // LEVEL = 'error' (permanent hard gate): migration complete as of Phase 4.
  // All src/app/** screens are migrated; zero violations remain.
  //
  // no-restricted-imports covers the named-import bans (react-native named
  // exports + lucide + @expo/ui patterns). Flat-config note: since we use
  // separate rule keys (no-restricted-imports vs no-restricted-syntax) there
  // is no clobber risk between the import-ban block and the hex-warn block
  // below — they govern different rule keys.
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'react-native',
            importNames: ['Pressable', 'Modal', 'TouchableOpacity', 'TouchableHighlight'],
            message: 'No raw Pressable/Modal/TouchableOpacity/TouchableHighlight in screens — use a z-* primitive.',
          },
          {
            name: 'lucide-react-native',
            message: 'Use ZSymbol (expo-symbols) — icons live in components/ui.',
          },
        ],
        patterns: [
          {
            group: ['@expo/ui', '@expo/ui/*'],
            message: 'No raw @expo/ui in screens — go through a z-* primitive.',
          },
        ],
      }],
      // Raw hex literals in src/app/** are a warn (stories can live in
      // non-app directories; keep this consistent with the block below).
      'no-restricted-syntax': ['warn',
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,8})$/]",
          message: 'No raw hex — use role tokens (theme/roles.ts) or NativeWind z-* classes.',
        },
      ],
    },
  },
  // Hex-only guard for the rest of src/** (components, hooks, api, …).
  // Exempts:
  //   src/app/**          — already covered by the error block above
  //   src/call/**         — sanctioned dark call/video surface (Agora + hex backgrounds)
  //   src/theme/colors.ts — GENERATED token file; it IS the hex definition layer
  //   src/theme/roles.ts  — GENERATED token file
  //   src/components/ui/z-screen.tsx — owns the safe-area background token purposefully
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/app/**',
      'src/call/**',
      'src/theme/colors.ts',
      'src/theme/roles.ts',
      'src/components/ui/z-screen.tsx',
    ],
    rules: {
      'no-restricted-syntax': ['warn',
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,8})$/]",
          message: 'No raw hex — use role tokens (theme/roles.ts) or NativeWind z-* classes.',
        },
      ],
    },
  },
]);
