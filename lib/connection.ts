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
