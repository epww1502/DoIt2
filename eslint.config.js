// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const jsoncPlugin = require('eslint-plugin-jsonc');
const jsoncParser = require('jsonc-eslint-parser');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  // locales JSON: 중복 키 시 빨간 줄
  {
    files: ['locales/*.json'],
    plugins: { jsonc: jsoncPlugin },
    languageOptions: { parser: jsoncParser },
    rules: {
      'jsonc/no-dupe-keys': 'error',
    },
  },
]);
