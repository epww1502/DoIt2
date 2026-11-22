import { useProfileStore } from '@/store/useProfileStore';

/**
 * 시작 화면에서 적은 닉네임을 내 프로필에 저장한다. 비워 뒀거나 이미 같은 이름이면 아무것도 하지 않는다.
 * 닉네임은 덤이라 저장에 실패해도 시작을 막지 않는다 (나중에 프로필에서 다시 정할 수 있다).
 */
export async function saveNicknameQuietly(raw: string) {
  const nickname = raw.trim();
  if (!nickname) return;
  try {
    // 불러오지 않은 채 저장하면 서버에 있던 프로필 사진을 덮어쓴다
    if (useProfileStore.getState().loadStatus !== 'ready') {
      await useProfileStore.getState().load();
    }
    const { profile, loadStatus, save } = useProfileStore.getState();
    if (loadStatus !== 'ready' || profile?.nickname === nickname) return;
    await save({ nickname });
  } catch {
    // 나중에 프로필에서 다시 정할 수 있다
  }
}
