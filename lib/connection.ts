/**
 * 서버(Supabase)에 닿는지 여부. 네트워크 라이브러리 없이(새 빌드 없이) 요청 결과로 판단한다.
 * - 요청이 네트워크 문제로 실패하면 offline
 * - 아무 요청이나 성공하면 online
 */
import { create } from 'zustand';

import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

type ConnectionState = {
  online: boolean;
  /** 마지막으로 오프라인 → 온라인이 된 시각 (다시 연결됐다는 안내용) */
  reconnectedAt: number | null;
  markOnline: () => void;
  markOffline: () => void;
};

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  online: true,
  reconnectedAt: null,
  markOnline: () => {
    if (get().online) return;
    set({ online: true, reconnectedAt: Date.now() });
  },
  markOffline: () => {
    if (!get().online) return;
    set({ online: false });
  },
}));

/**
 * 인터넷 문제로 실패한 건지. 서버가 거절한 것(권한, 잘못된 값)과 구분한다.
 * supabase-js는 fetch 실패를 'Network request failed' 같은 메시지로 돌려준다.
 */
export function isNetworkError(e: unknown) {
  if (!e) return false;
  const err = e as { name?: string; message?: string; status?: number };
  const text = `${err.name ?? ''} ${err.message ?? String(e)}`;
  if (/Retryable|StorageUnknownError/i.test(text)) return true;
  if (/network|fetch|timed? ?out|abort|connection|offline/i.test(text)) {
    return true;
  }
  return err.status === 0;
}

/** 잠깐 안 된 것으로 보는 오류 코드: 서버 연결·과부하·시간 초과(PGRST00x, 08, 53, 57), 로그인 만료(PGRST30x), 동시 변경 충돌(40) */
const TRANSIENT_CODE = /^(PGRST00\d|PGRST30\d|08|53|57|40)/;

/**
 * 서버가 이 변경을 받아들이지 않겠다고 분명히 거절한 것인지 (권한 없음, 잘못된 값, 없는 항목).
 * 거절된 변경은 다시 보내도 소용없어서 대기열에서 뺀다.
 * 인터넷 문제, 서버 오류(5xx), 너무 많은 요청(429), 로그인 만료(401)나 무슨 오류인지 모를 때는
 * 거절이 아니다: 대기열에 두고 다시 올린다 (버리면 방금 바꾼 것이 말없이 사라진다).
 */
export function isServerRejection(e: unknown) {
  if (!e || isNetworkError(e)) return false;
  const err = e as { code?: unknown; status?: unknown; statusCode?: unknown };
  const status = Number(err.status ?? err.statusCode ?? 0);
  if (status === 401 || status === 408 || status === 429 || status >= 500) {
    return false;
  }
  if (typeof err.code === 'string' && err.code !== '') {
    return !TRANSIENT_CODE.test(err.code);
  }
  return status >= 400 && status < 500;
}

/** 실패 원인이 네트워크면 오프라인으로 표시한다 */
export function noteFailure(e: unknown) {
  if (isNetworkError(e)) useConnectionStore.getState().markOffline();
}

/** 서버에 닿는지 가볍게 확인한다 (누구나 읽을 수 있는 작은 표 한 줄) */
export async function pingServer() {
  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase
      .from('app_versions')
      .select('platform')
      .limit(1);
    if (error) {
      noteFailure(error);
      return !isNetworkError(error);
    }
    useConnectionStore.getState().markOnline();
    return true;
  } catch (e) {
    noteFailure(e);
    return false;
  }
}
