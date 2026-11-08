// 같은 공간 사람들에게 푸시 알림 보내기 (Expo 푸시 서비스).
// 앱이 항목을 담거나 기록을 남긴 뒤 부른다. 부른 사람(로그인 JWT)은 받지 않는다.
// 배포된 버전과 같은 코드다. 바꾸면 Supabase MCP deploy_edge_function 또는 supabase CLI로 다시 배포한다.
//
// 요청 본문
// - { spaceId, event: 'added', itemIds: string[] }  새로 담음 (여러 개면 한 번에)
// - { spaceId, event: 'done',  itemIds: [string] }  기록을 처음 남김 (별점은 부른 사람의 평가)
// - { spaceId, event: 'reviewed', itemIds: [string] }  다른 사람이 남긴 기록에 내 평가를 더함
// - { spaceId, event: 'commented', itemIds: [string] }  항목에 댓글을 남김 (부른 사람의 최근 댓글)
// - { spaceId, event: 'todo', itemIds: [string], todoIds: string[] }  할 것을 체크함
//   (지금도 체크돼 있는 것만 알린다. 알림함에는 예전 앱도 알아보게 kind 'done'으로 남긴다)
// - { spaceId, event: 'photos', itemIds: [string], photoCount: number }  이미 남긴 평가에 사진을 더 올림
//   (평가가 막 바뀌었을 때만. 알림함에는 예전 앱도 알아보게 kind 'reviewed'로 남긴다)
// - { spaceId, event: 'liked', itemIds: [string], photoPath: string }  사진에 하트를 누름
//   (그 사진을 올린 사람에게만, 하트를 막 눌렀을 때만. kind 'reviewed')
// - { spaceId, event: 'wanted', itemIds: [string] }  '하고 싶어요'를 누름
//   (막 눌렀을 때만, 같은 사람이 같은 항목으로 12시간 안에 또 보내지 않는다. kind 'added')
//
// 알림함 detail: 'photos' | 'liked' | 'wanted' (새 앱만 보고 아이콘을 고른다. 예전 앱은 kind만 본다)
//
// 막 바뀐 항목(최근 10분)만 알린다. 예전 항목으로 알림을 계속 보내는 걸 막으려고.
// 받는 사람마다 notifications(알림함)에도 한 줄씩 남긴다 (푸시를 꺼둔 사람도 앱에서 볼 수 있게).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_ITEMS = 50;
const FRESH_MS = 10 * 60 * 1000;
/** '하고 싶어요'를 껐다 켰다 해도 알림이 계속 가지 않게 */
const WANTED_QUIET_MS = 12 * 60 * 60 * 1000;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type Body = {
  spaceId?: string;
  event?:
    | 'added'
    | 'done'
    | 'reviewed'
    | 'commented'
    | 'todo'
    | 'photos'
    | 'liked'
    | 'wanted';
  itemIds?: string[];
  todoIds?: string[];
  /** event 'photos': 새로 올린 사진 수 */
  photoCount?: number;
  /** event 'liked': 하트를 누른 사진 경로 */
  photoPath?: string;
};

type Todo = { id?: string; text?: string; done?: boolean };

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
    ![
      'added',
      'done',
      'reviewed',
      'commented',
      'todo',
      'photos',
      'liked',
      'wanted',
    ].includes(event ?? '') ||
    !itemIds.length ||
    (event === 'liked' && !body.photoPath)
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
  let others = members.map((m) => m.user_id).filter((id) => id !== actor);
  if (others.length === 0) return json({ sent: 0 });

  // 하트: 그 사진을 올린 사람에게만, 방금 누른 하트일 때만
  if (event === 'liked') {
    const photoPath = body.photoPath!;
    const [{ data: owners }, { data: like }] = await Promise.all([
      admin
        .from('item_reviews')
        .select('user_id')
        .eq('item_id', itemIds[0])
        .contains('photos', [photoPath]),
      admin
        .from('photo_likes')
        .select('created_at')
        .eq('photo_path', photoPath)
        .eq('user_id', actor)
        .maybeSingle(),
    ]);
    const owner = owners?.[0]?.user_id;
    if (
      !owner ||
      !others.includes(owner) ||
      !like ||
      Date.now() - new Date(like.created_at).getTime() >= FRESH_MS
    ) {
      return json({ sent: 0 });
    }
    others = [owner];
  }

  // 하고 싶어요: 방금 누른 것만 (지금 몇 명인지도 같이)
  let wantCount = 0;
  if (event === 'wanted') {
    const { data: wants } = await admin
      .from('item_wants')
      .select('user_id, created_at')
      .eq('item_id', itemIds[0]);
    const mine = wants?.find((w) => w.user_id === actor);
    if (!mine || Date.now() - new Date(mine.created_at).getTime() >= FRESH_MS) {
      return json({ sent: 0 });
    }
    wantCount = wants!.length;
  }

  // 이 공간 항목과, 부른 사람이 남긴 평가·최근 댓글
  const [{ data: items }, { data: reviews }, { data: comments }] =
    await Promise.all([
      admin
        .from('bucket_items')
        .select('id, title, updated_at, todos')
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
    event === 'liked' || event === 'wanted'
      ? true
      : event === 'reviewed' || event === 'photos'
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
  } else if (event === 'todo') {
    // 보낸 할 것 중 지금도 체크돼 있는 것만
    const wanted = new Set((body.todoIds ?? []).slice(0, 30));
    const checked = ((first.todos as Todo[] | null) ?? []).filter(
      (t) => t.id && wanted.has(t.id) && t.done && t.text
    );
    if (checked.length === 0) return json({ sent: 0 });
    const what =
      checked.length === 1
        ? quote(checked[0].text!)
        : `${quote(checked[0].text!)} 외 ${checked.length - 1}개`;
    message = `${name}님이 ${quote(first.title)}에서 ${what}을(를) 했어요 ✓`;
  } else if (event === 'photos') {
    const count = Math.min(Math.max(Math.round(body.photoCount ?? 1), 1), 5);
    message = `${name}님이 ${quote(first.title)}에 사진 ${count}장을 올렸어요 📷`;
  } else if (event === 'liked') {
    message = `${name}님이 ${quote(first.title)}에 올린 사진에 하트를 눌렀어요 ❤️`;
  } else if (event === 'wanted') {
    message =
      wantCount >= 2
        ? `${name}님도 ${quote(first.title)}을(를) 하고 싶어해요 🙌 지금 ${wantCount}명이에요`
        : `${name}님이 ${quote(first.title)}을(를) 하고 싶어해요 🙌`;
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

  // 하고 싶어요: 같은 사람이 같은 항목으로 얼마 전에 보냈으면 그만 (알림 문구에 이름·제목이 들어 있다)
  if (event === 'wanted') {
    const since = new Date(Date.now() - WANTED_QUIET_MS).toISOString();
    const { data: recent } = await admin
      .from('notifications')
      .select('id, body')
      .eq('space_id', spaceId)
      .eq('item_id', first.id)
      .eq('detail', 'wanted')
      .gte('created_at', since)
      .limit(50);
    const who = `${name}님`;
    if (recent?.some((n) => n.body.startsWith(who))) return json({ sent: 0 });
  }

  // 알림함 (실패해도 푸시는 보낸다)
  await admin
    .from('notifications')
    .insert(
      others.map((userId) => ({
        user_id: userId,
        space_id: spaceId,
        item_id: itemId,
        // 예전 앱은 'todo'·'photos'·'liked'·'wanted'를 몰라서 아는 종류로 남긴다
        kind:
          event === 'todo'
            ? 'done'
            : event === 'photos' || event === 'liked'
              ? 'reviewed'
              : event === 'wanted'
                ? 'added'
                : event,
        detail:
          event === 'photos' || event === 'liked' || event === 'wanted'
            ? event
            : null,
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
