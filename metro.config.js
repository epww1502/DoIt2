// Sentry's Expo config wraps Expo's default config and adds debug IDs to bundles,
// so uploaded source maps can be matched to errors (store builds and OTA updates).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, {
  input: './global.css',
  inlineRem: 16,
});
