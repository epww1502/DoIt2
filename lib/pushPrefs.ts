/**
 * 알림 종류별 켜고 끄기. 끈 묶음을 내 프로필(profiles.push_muted)에 저장하고,
 * 서버 notify 함수가 그 묶음은 푸시를 보내지 않는다 (알림함에는 남는다).
 * 묶음 이름은 supabase/functions/notify의 PUSH_GROUP과 같게 둔다.
 */
import { supabase } from '@/lib/supabase/client';

export const PUSH_GROUPS = [
  {
    key: 'added',
    label: '새로 담은 것',
    description: '누가 버킷리스트를 담으면',
  },
  {
    key: 'record',
    label: '기록·평가',
    description: '기록을 남기거나 평가·사진을 더하면',
  },
  { key: 'todo', label: '할 것 체크', description: '할 것을 체크하면' },
  { key: 'comment', label: '댓글', description: '댓글이 달리면' },
  { key: 'like', label: '사진 하트', description: '내 사진에 하트를 누르면' },
  {
    key: 'plan',
    label: '하고 싶어요·같이 갈 날',
    description: '하고 싶어요를 누르거나 되는 날을 고르면',
  },
] as const;

export type PushGroup = (typeof PUSH_GROUPS)[number]['key'];

/** 내가 끈 알림 묶음 */
export async function fetchMutedGroups(userId: string): Promise<PushGroup[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('push_muted')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.push_muted ?? []) as PushGroup[];
}

/** 끈 묶음을 저장한다. 프로필이 아직 없으면 만든다 (닉네임·사진은 건드리지 않는다) */
export async function saveMutedGroups(userId: string, muted: PushGroup[]) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, push_muted: muted });
  if (error) throw error;
}

/** 묶음 하나를 켜거나 끈 뒤의 목록 */
export function toggleGroup(
  muted: PushGroup[],
  group: PushGroup,
  on: boolean
): PushGroup[] {
  const rest = muted.filter((g) => g !== group);
  return on ? rest : [...rest, group];
}
