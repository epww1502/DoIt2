const { existsSync } = require('fs');

/** Firebase(안드로이드 알림)용 파일. 프로젝트 맨 위에 두면 빌드에 들어간다 */
const GOOGLE_SERVICES_FILE = './google-services.json';

const SENTRY_PLUGIN = '@sentry/react-native/expo';

/**
 * 스토어 빌드에서 Sentry에 소스맵을 올릴 수 있는지. 조직·프로젝트 이름은 app.json에 있고,
 * EAS 환경 변수 SENTRY_AUTH_TOKEN이 있을 때만 올린다.
 * 토큰 없이 올리려 하면 네이티브 빌드가 실패하므로, 그때는 올리기를 끈다.
 */
const sentryUploadReady = () => Boolean(process.env.SENTRY_AUTH_TOKEN);

/** Sentry 플러그인 설정에 올리기 여부를 넣는다 */
const withSentryUpload = (plugins = []) =>
  plugins.map((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    if (name !== SENTRY_PLUGIN) return plugin;
    const options = Array.isArray(plugin) ? (plugin[1] ?? {}) : {};
    return [
      SENTRY_PLUGIN,
      { ...options, disableAutoUpload: !sentryUploadReady() },
    ];
  });

// app.json 설정을 그대로 쓰고, Firebase 파일이 있을 때만 알림 설정을 더한다.
// 파일이 없을 때 넣으면 개발 서버가 설정을 못 읽어서 앱이 열리지 않는다.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(existsSync(GOOGLE_SERVICES_FILE)
      ? { googleServicesFile: GOOGLE_SERVICES_FILE }
      : {}),
  },
  plugins: withSentryUpload(config.plugins),
});
