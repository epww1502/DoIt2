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
    // supabase/functions 는 Deno에서 도는 서버 코드라 앱 린트에서 뺀다
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'supabase/functions/**'],
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
