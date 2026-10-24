const { existsSync } = require('fs');

/** Firebase(안드로이드 알림)용 파일. 프로젝트 맨 위에 두면 빌드에 들어간다 */
const GOOGLE_SERVICES_FILE = './google-services.json';

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
});
