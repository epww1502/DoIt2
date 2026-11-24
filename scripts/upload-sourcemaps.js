#!/usr/bin/env node
/**
 * Upload the source maps of an exported bundle (`dist` by default) to Sentry.
 * Runs Sentry's Expo upload CLI. On Windows it points the CLI at the native sentry-cli.exe,
 * because the default `@sentry/cli/bin/sentry-cli` is a script that cannot be spawned directly there.
 *
 * Needs SENTRY_AUTH_TOKEN (run through `eas env:exec production ...`); org and project come from app.json.
 */
if (process.platform === 'win32' && !process.env.SENTRY_CLI_EXECUTABLE) {
  try {
    process.env.SENTRY_CLI_EXECUTABLE = require.resolve(
      `@sentry/cli-win32-${process.arch}/bin/sentry-cli.exe`
    );
  } catch {
    // Fall back to the CLI's own lookup
  }
}

if (process.argv.length < 3) process.argv.push('dist');

require('@sentry/expo-upload-sourcemaps/cli.js');
