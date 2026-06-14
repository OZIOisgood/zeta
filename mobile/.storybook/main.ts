import type { StorybookConfig } from '@storybook/react-native-web-vite';
import { mergeConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Storybook 10 loads `main.ts` as ESM, so `__dirname` is undefined — derive it.
const dirname = path.dirname(fileURLToPath(import.meta.url));

// Babel resolves preset *names* against a virtual base, which can't find
// transitive packages in pnpm's strict node_modules layout. Resolve the two
// presets to absolute paths so the injected NativeWind pass loads reliably.
// `babel-preset-expo` is a transitive dep of `expo`, so resolve it through
// expo's require context; `nativewind/babel` resolves from the project root.
const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const babelPresetExpo = expoRequire.resolve('babel-preset-expo');
const nativewindBabel = require.resolve('nativewind/babel');

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      // Inject NativeWind's className -> style transform into the React/babel pass.
      // `pluginReactOptions` is typed as `RnwOptions` = `@vitejs/plugin-react`'s
      // `Options`, which exposes both top-level `jsxImportSource` and `babel`
      // (a `BabelOptions`/`TransformOptions` with `presets`). Verified against the
      // installed `@storybook/react-native-web-vite@10.4.4` + `vite-plugin-rnw@0.0.11`
      // types. These presets mirror the project's `babel.config.js`.
      pluginReactOptions: {
        jsxImportSource: 'nativewind',
        babel: {
          // Anchor Babel's plugin/preset name resolution at the project root so
          // bare names referenced *inside* babel-preset-expo (e.g.
          // `@babel/plugin-transform-react-jsx`) resolve against the real
          // node_modules instead of the virtual base used by vite-plugin-react.
          cwd: path.resolve(dirname, '..'),
          root: path.resolve(dirname, '..'),
          presets: [[babelPresetExpo, { jsxImportSource: 'nativewind' }], nativewindBabel],
        },
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
        },
      },
    });
  },
};
export default config;
