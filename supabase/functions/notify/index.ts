// 같은 공간 사람들에게 푸시 알림 보내기 (Expo 푸시 서비스).
// 앱이 항목을 담거나 기록을 남긴 뒤 부른다. 부른 사람(로그인 JWT)은 받지 않는다.
// 배포된 버전과 같은 코드다. 바꾸면 Supabase MCP deploy_edge_function 또는 supabase CLI로 다시 배포한다.
//
// 요청 본문
// - { spaceId, event: 'added', itemIds: string[] }  새로 담음 (여러 개면 한 번에)
// - { spaceId, event: 'done',  itemIds: [string] }  기록을 처음 남김 (별점은 부른 사람의 평가)
// - { spaceId, event: 'reviewed', itemIds: [string] }  다른 사람이 남긴 기록에 내 평가를 더함
// - { spaceId, event: 'commented', itemIds: [string] }  항목에 댓글을 남김 (부른 사람의 최근 댓글)
//
// 막 바뀐 항목(최근 10분)만 알린다. 예전 항목으로 알림을 계속 보내는 걸 막으려고.
// 받는 사람마다 notifications(알림함)에도 한 줄씩 남긴다 (푸시를 꺼둔 사람도 앱에서 볼 수 있게).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_ITEMS = 50;
const FRESH_MS = 10 * 60 * 1000;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type Body = {
  spaceId?: string;
  event?: 'added' | 'done' | 'reviewed' | 'commented';
  itemIds?: string[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 이 공간에서 보이는 이름 (그 공간에서 공개를 껐으면 '멤버') */
async function displayName(spaceId: string, userId: string) {
  const [{ data: member }, { data: profile }] = await Promise.all([
    admin
      .from('space_members')
      .select('nickname, show_profile')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('nickname')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  if (!member?.show_profile) return '멤버';
  return member.nickname || profile?.nickname || '멤버';
}

function quote(title: string) {
  const short = title.length > 20 ? `${title.slice(0, 20)}…` : title;
  return `'${short}'`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await admin.auth.getUser(token);
  const actor = auth.user?.id;
  if (!actor) return json({ error: 'unauthorized' }, 401);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  const { spaceId, event } = body;
  const itemIds = (body.itemIds ?? []).slice(0, MAX_ITEMS);
  if (
    !spaceId ||
    !['added', 'done', 'reviewed', 'commented'].includes(event ?? '') ||
    !itemIds.length
  ) {
    return json({ error: 'invalid_body' }, 400);
  }

  // 부른 사람이 이 공간 멤버인지
  const { data: members } = await admin
    .from('space_members')
    .select('user_id')
    .eq('space_id', spaceId);
  if (!members?.some((m) => m.user_id === actor)) {
    return json({ error: 'not_member' }, 403);
  }
  const others = members.map((m) => m.user_id).filter((id) => id !== actor);
  if (others.length === 0) return json({ sent: 0 });

  // 이 공간 항목과, 부른 사람이 남긴 평가·최근 댓글
  const [{ data: items }, { data: reviews }, { data: comments }] =
    await Promise.all([
      admin
        .from('bucket_items')
        .select('id, title, updated_at')
        .eq('space_id', spaceId)
        .in('id', itemIds),
      admin
        .from('item_reviews')
        .select('item_id, rating, updated_at')
        .eq('user_id', actor)
        .in('item_id', itemIds),
      admin
        .from('item_comments')
        .select('item_id, body, created_at')
        .eq('user_id', actor)
        .in('item_id', itemIds)
        .order('created_at', { ascending: false })
        .limit(MAX_ITEMS),
    ]);
  const commentOf = new Map<string, { body: string; created_at: string }>();
  for (const c of comments ?? []) {
    if (!commentOf.has(c.item_id)) commentOf.set(c.item_id, c);
  }
  const reviewOf = new Map((reviews ?? []).map((r) => [r.item_id, r]));
  // 막 바뀐 것만 (평가 알림은 평가가 막 바뀌었는지로 본다)
  const isFresh = (at: string | undefined) =>
    !!at && Date.now() - new Date(at).getTime() < FRESH_MS;
  const fresh = (items ?? []).filter((it) =>
    event === 'reviewed'
      ? isFresh(reviewOf.get(it.id)?.updated_at)
      : event === 'commented'
        ? isFresh(commentOf.get(it.id)?.created_at)
        : isFresh(it.updated_at)
  );
  if (fresh.length === 0) return json({ sent: 0 });

  const [{ data: space }, name, { data: tokens }] = await Promise.all([
    admin.from('spaces').select('name, emoji').eq('id', spaceId).single(),
    displayName(spaceId, actor),
    admin.from('push_tokens').select('token').in('user_id', others),
  ]);
  const first = fresh[0];
  let message: string;
  const rating = reviewOf.get(first.id)?.rating ?? 0;
  const stars = rating > 0 ? ` ${'★'.repeat(rating)}` : '';
  if (event === 'done') {
    message = `${name}님이 ${quote(first.title)} 기록을 남겼어요${stars}`;
  } else if (event === 'reviewed') {
    message = `${name}님도 ${quote(first.title)}에 평가를 남겼어요${stars}`;
  } else if (event === 'commented') {
    const body = commentOf.get(first.id)?.body ?? '';
    const short = body.length > 30 ? `${body.slice(0, 30)}…` : body;
    message = `${name}님이 ${quote(first.title)}에 댓글을 남겼어요: “${short}”`;
  } else {
    message =
      fresh.length === 1
        ? `${name}님이 ${quote(first.title)}을(를) 담았어요`
        : `${name}님이 ${quote(first.title)} 외 ${fresh.length - 1}개를 담았어요`;
  }

  const title = space ? `${space.emoji} ${space.name}` : 'DoIt2';
  const itemId = fresh.length === 1 ? first.id : null;

  // 알림함 (실패해도 푸시는 보낸다)
  await admin
    .from('notifications')
    .insert(
      others.map((userId) => ({
        user_id: userId,
        space_id: spaceId,
        item_id: itemId,
        kind: event,
        title,
        body: message,
      }))
    )
    .then(({ error }) => {
      if (error) console.error('inbox insert failed', error.message);
    });

  if (!tokens?.length) return json({ sent: 0 });

  const messages = tokens.map((t) => ({
    to: t.token,
    title,
    body: message,
    sound: 'default',
    channelId: 'default',
    // 누르면 이 공간의 그 항목으로
    data: { spaceId, itemId },
  }));

  // Expo는 한 번에 100개까지 받는다
  const stale: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(chunk),
    });
    const result = (await res.json().catch(() => null)) as {
      data?: { status: string; details?: { error?: string } }[];
    } | null;
    // 앱을 지운 폰의 토큰은 정리한다
    result?.data?.forEach((ticket, j) => {
      if (ticket.details?.error === 'DeviceNotRegistered') {
        stale.push(chunk[j].to);
      }
    });
  }
  if (stale.length) {
    await admin.from('push_tokens').delete().in('token', stale);
  }

  return json({ sent: messages.length - stale.length });
});
