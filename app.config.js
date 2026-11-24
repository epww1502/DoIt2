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
    const upload = sentryUploadReady();
    return [
      SENTRY_PLUGIN,
      {
        ...options,
        disableAutoUpload: !upload,
        // 안드로이드 빌드는 코드를 줄이고 이름을 바꾼다(expo-build-properties의 minify).
        // 그 대응표를 같이 올려야 Sentry에서 네이티브 오류 위치를 읽을 수 있다. 토큰이 있을 때만 켠다
        ...(upload
          ? {
              experimental_android: {
                enableAndroidGradlePlugin: true,
                includeProguardMapping: true,
                autoUploadProguardMapping: true,
                uploadNativeSymbols: false,
              },
            }
          : {}),
      },
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
