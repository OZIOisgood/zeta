import type { StorybookConfig } from '@storybook/react-native-web-vite';
import { mergeConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Storybook 10 loads `main.ts` as ESM, so `__dirname` is undefined — derive it.
const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      // NativeWind's automatic JSX runtime maps `className` -> styles. We pass
      // ONLY `jsxImportSource: 'nativewind'` to @vitejs/plugin-react (the
      // framework's React plugin owns the single JSX transform). We deliberately
      // do NOT inject `babel-preset-expo` here: it is Metro-specific and runs
      // @babel/plugin-transform-modules-commonjs, which rewrites our ESM to CJS
      // and collides with Vite's ESM pipeline — the resulting double interop
      // throws `_interopRequireDefault is not a function` at runtime and blanks
      // the canvas. The framework's vite-plugin-rnw already strips Flow from RN
      // internals, so the Expo preset is not needed for our TS/RNW source.
      pluginReactOptions: {
        jsxImportSource: 'nativewind',
      },
    },
  },
  async viteFinal(cfg) {
    return mergeConfig(cfg, {
      // PostCSS inline (Storybook-scoped) so Expo's Metro web build is never affected.
      css: {
        postcss: {
          plugins: [
            tailwindcss(path.resolve(dirname, '../tailwind.config.js')),
            autoprefixer(),
          ],
        },
      },
      resolve: {
        alias: {
          'expo-video': path.resolve(dirname, 'mocks/expo-video.tsx'),
          'expo-camera': path.resolve(dirname, 'mocks/expo-camera.tsx'),
          'react-native-agora': path.resolve(dirname, 'mocks/react-native-agora.tsx'),
          'react-native-qrcode-svg': path.resolve(
            dirname,
            '../src/__mocks__/react-native-qrcode-svg.tsx',
          ),
          // lucide-react-native@1.17.0 ships a malformed ESM build: its barrel
          // (dist/esm/lucide-react-native.mjs) re-exports `LucideProvider` from
          // context.mjs, but the compiled context.mjs only exports
          // `useLucideContext`. Vite's strict ESM resolver picks the import/browser
          // condition and binds the icon's `useLucideContext()` to undefined, which
          // throws at render time and blanks the canvas. Resolve to the CJS build
          // (the `require` condition Metro/the app uses) — it tolerates the missing
          // export and provides every named icon. Only the bare specifier is
          // imported anywhere in the app, so this exact alias is safe.
          'lucide-react-native': path.resolve(
            dirname,
            '../node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
          ),
        },
      },
      optimizeDeps: {
        // Force esbuild to pre-bundle the aliased CJS lucide build so the named
        // icon imports (LucidePlus, Pencil, …) get correct CJS->ESM interop in dev.
        include: ['lucide-react-native'],
      },
    });
  },
};
export default config;
