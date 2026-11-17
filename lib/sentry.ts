/**
 * Sentry 오류 수집 (새 빌드부터). 직접 만든 오류 기록(lib/errorReport.ts)이 못 잡는
 * '앱이 통째로 꺼지는 경우'(네이티브 쪽에서 죽는 것)까지 잡으려고 같이 쓴다.
 *
 * - 개발 중에는 보내지 않는다.
 * - 누구인지는 계정 id(익명 계정의 임의 글자)만 붙인다. 닉네임·항목 이름·쓴 글은 보내지 않는다.
 * - Sentry 모듈이 없는 예전 빌드에서는 아무 일도 하지 않는다.
 */
import { TurboModuleRegistry } from 'react-native';

/** 앱에 넣어도 되는 공개 값 (오류를 받는 주소) */
const DSN =
  'https://0837ebef749ee3a2c9d8c4d3f533402e@o4512446809702400.ingest.us.sentry.io/4512446820122624';

type SentryModule = typeof import('@sentry/react-native');
let sentry: SentryModule | null = null;

/** 이 빌드에 Sentry 네이티브 모듈이 있는지 */
function nativeAvailable() {
  try {
    return TurboModuleRegistry.get('RNSentry') != null;
  } catch {
    return false;
  }
}

/** 앱을 켤 때 한 번 부른다 */
export function initSentry() {
  if (__DEV__ || sentry || !nativeAvailable()) return;
  try {
    // 예전 빌드에서 바로 불러오지 않게, 쓸 때만 불러온다
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native') as SentryModule;
    Sentry.init({
      dsn: DSN,
      // IP 주소 같은 개인 정보를 자동으로 붙이지 않는다
      sendDefaultPii: false,
      // 속도 측정은 쓰지 않는다 (오류만)
      tracesSampleRate: 0,
    });
    sentry = Sentry;
  } catch {
    // 오류 수집이 안 돼도 앱은 그대로 동작해야 한다
  }
}

/** 로그인한 계정 id를 붙인다 (같은 오류가 몇 명에게 났는지 세려고). null이면 뗀다 */
export function setSentryUser(userId: string | null) {
  try {
    sentry?.setUser(userId ? { id: userId } : null);
  } catch {
    // 무시
  }
}

/** 직접 만든 오류 기록에 남기는 오류를 Sentry에도 보낸다 */
export function captureForSentry(e: unknown, kind: string, title?: string) {
  try {
    sentry?.captureException(e, {
      tags: { kind },
      ...(title ? { extra: { title } } : {}),
    });
  } catch {
    // 무시
  }
}
