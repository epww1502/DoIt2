// 계정 삭제: 부른 사람(로그인 JWT)의 계정과 데이터를 지운다. 되돌릴 수 없다.
// 배포된 버전과 같은 코드다. 바꾸면 Supabase MCP deploy_edge_function 또는 supabase CLI로 다시 배포한다.
//
// - 혼자 있는 공간: 공간·항목·사진을 모두 지운다
// - 함께 쓰는 공간: 나가기만 한다 (공간장이면 가장 먼저 들어온 멤버에게 넘긴다).
//   내가 담은 항목은 공간에 남고 '담은 사람'만 비워진다
// - 프로필 사진, 프로필, 알림 토큰, 계정 코드, 공유 목록, 웹으로 공유한 돌아보기(사진 포함)를 지운다
// - 마지막으로 로그인 계정을 지운다
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'photos';
/** 웹으로 공유한 돌아보기 사진 (공개 버킷). 경로는 {공유 id}/{파일 이름} */
const SHARED_BUCKET = 'shared';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 저장소 폴더 안의 파일을 모두 지운다 (하위 폴더 없음) */
async function removeFolder(folder: string, bucket = BUCKET) {
  for (;;) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(folder, { limit: 100 });
    if (error || !data || data.length === 0) return;
    const paths = data.filter((f) => f.id).map((f) => `${folder}/${f.name}`);
    if (paths.length === 0) return;
    await admin.storage.from(bucket).remove(paths);
    if (data.length < 100) return;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await admin.auth.getUser(token);
  const uid = auth.user?.id;
  if (!uid) return json({ error: 'unauthorized' }, 401);

  // 내가 들어가 있는 공간들
  const { data: mine, error: mineError } = await admin
    .from('space_members')
    .select('space_id')
    .eq('user_id', uid);
  if (mineError) return json({ error: 'delete_failed' }, 500);

  for (const { space_id } of mine ?? []) {
    const { data: members, error: membersError } = await admin
      .from('space_members')
      .select('user_id, joined_at')
      .eq('space_id', space_id)
      .order('joined_at', { ascending: true });
    // 멤버를 못 읽었는데 '혼자 있는 공간'으로 보고 지우면 다른 사람들 것까지 사라진다
    if (membersError || !members) return json({ error: 'delete_failed' }, 500);
    const others = members.filter((m) => m.user_id !== uid);

    if (others.length === 0) {
      // 혼자 있는 공간: 사진까지 모두 지운다 (항목은 공간과 함께 지워진다)
      await removeFolder(space_id);
      await admin.from('spaces').delete().eq('id', space_id);
      continue;
    }

    // 함께 쓰는 공간: 공간장이면 넘기고 나간다
    const { data: space } = await admin
      .from('spaces')
      .select('owner_id')
      .eq('id', space_id)
      .single();
    if (space?.owner_id === uid) {
      await admin
        .from('spaces')
        .update({ owner_id: others[0].user_id })
        .eq('id', space_id);
    }
    await admin
      .from('space_members')
      .delete()
      .eq('space_id', space_id)
      .eq('user_id', uid);
  }

  // 프로필 사진
  await removeFolder(`avatars/${uid}`);

  // 웹으로 공유한 돌아보기의 사진 (공개 버킷이라 꼭 지운다. 링크 자체는 계정과 함께 지워진다)
  const { data: memories, error: memoriesError } = await admin
    .from('shared_memories')
    .select('id')
    .eq('created_by', uid);
  if (memoriesError) return json({ error: 'delete_failed' }, 500);
  for (const { id } of memories ?? []) await removeFolder(id, SHARED_BUCKET);

  // 로그인 계정 (프로필·알림 토큰·계정 코드·공유 목록은 함께 지워진다)
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return json({ error: 'delete_failed' }, 500);

  return json({ deleted: true });
});
