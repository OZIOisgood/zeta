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
]);
