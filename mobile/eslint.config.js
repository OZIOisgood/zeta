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
  // src/app/** screens must not import raw @expo/ui, Pressable, Modal, or
  // lucide-react-native — those live only in src/components/ui/** z-* primitives.
  //
  // NOTE on no-restricted-syntax merge: flat-config applies the LAST matching
  // block's rule value when the same rule key appears in multiple blocks for
  // the same file. To prevent a later hex-warn block from overriding the
  // Pressable/Modal error selectors, we combine ALL no-restricted-syntax
  // selectors (imports + hex) into one src/app/** block. A separate hex-only
  // block then covers the rest of src/** (non-app files).
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
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
      // Combined: Pressable/Modal import selectors + hex literal selector.
      // All three selectors must live in one block so that no later config
      // block for src/app/** can clobber the import selectors by redefining
      // the same rule key.
      'no-restricted-syntax': ['error',
        {
          selector: "ImportDeclaration[source.value='react-native'] ImportSpecifier[imported.name='Pressable']",
          message: 'No raw Pressable in screens — use Touchable / a z-* primitive.',
        },
        {
          selector: "ImportDeclaration[source.value='react-native'] ImportSpecifier[imported.name='Modal']",
          message: 'No raw Modal in screens — use the formSheet route / ZDialogPanel.',
        },
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,8})$/]",
          message: 'No raw hex — use role tokens (theme/roles.ts) or NativeWind z-* classes.',
        },
      ],
    },
  },
  // Hex-only guard for the rest of src/** (components, hooks, api, …).
  // Exempts:
  //   src/app/**          — already covered by the error block above (combined selectors)
  //   src/call/**         — sanctioned dark call/video surface (Agora + hex backgrounds)
  //   src/theme/colors.ts — GENERATED token file; it IS the hex definition layer
  //   src/components/ui/z-screen.tsx — owns the safe-area background token purposefully
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/app/**',
      'src/call/**',
      'src/theme/colors.ts',
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
