/**
 * 서버·네트워크 오류를 사용자에게 보여줄 한국어 문구로 바꾼다.
 * 서버가 준 영어 메시지를 그대로 보여주지 않는다.
 */
import { isNetworkError, noteFailure } from '@/lib/connection';
import { showAlert } from '@/lib/dialog';

export type ErrorKind =
  'network' | 'server' | 'permission' | 'notFound' | 'unknown';

export type DescribedError = {
  kind: ErrorKind;
  /** 화면에 보여줄 설명 */
  message: string;
};

const MESSAGES: Record<ErrorKind, string> = {
  network: '인터넷 연결을 확인하고 다시 시도해주세요.',
  server: '서버에 잠시 문제가 있어요. 잠시 후 다시 시도해주세요.',
  permission: '이 작업을 할 수 있는 권한이 없어요.',
  notFound: '찾을 수 없어요. 이미 지워졌을 수 있어요.',
  unknown: '잠시 후 다시 시도해주세요.',
};

const HANGUL = /[가-힣]/;

export function describeError(e: unknown): DescribedError {
  if (isNetworkError(e)) return { kind: 'network', message: MESSAGES.network };
  const err = (e ?? {}) as {
    message?: string;
    code?: string;
    status?: number;
    statusCode?: string | number;
  };
  const message = typeof err.message === 'string' ? err.message : '';
  // 우리가 만든(RPC·스토어) 오류는 이미 한국어라 그대로 쓴다
  if (HANGUL.test(message)) return { kind: 'unknown', message };

  const status = Number(err.status ?? err.statusCode ?? 0);
  if (err.code === '42501' || status === 401 || status === 403) {
    return { kind: 'permission', message: MESSAGES.permission };
  }
  if (err.code === 'PGRST116' || status === 404) {
    return { kind: 'notFound', message: MESSAGES.notFound };
  }
  if (status >= 500 || /^5\d\d$/.test(err.code ?? '')) {
    return { kind: 'server', message: MESSAGES.server };
  }
  return { kind: 'unknown', message: MESSAGES.unknown };
}

/** 오류를 한국어 설명으로. 네트워크 문제면 오프라인 띠도 켠다 */
export function errorMessage(e: unknown) {
  noteFailure(e);
  return describeError(e).message;
}

/**
 * 작업이 실패했을 때 띄우는 팝업. onRetry를 주면 "다시 시도" 버튼이 생긴다.
 * 예: showErrorAlert('저장하지 못했어요', e, save)
 */
export function showErrorAlert(
  title: string,
  e: unknown,
  onRetry?: () => void | Promise<void>
) {
  const message = errorMessage(e);
  if (__DEV__) console.warn(`[error] ${title}`, e);
  showAlert(
    title,
    message,
    onRetry
      ? [
          { text: '닫기', style: 'cancel' },
          { text: '다시 시도', onPress: onRetry },
        ]
      : [{ text: '확인' }]
  );
}
