import { Share } from 'react-native';

import { itemTodos, type BucketItem } from '@/lib/bucket/types';
import { createSharedList } from '@/lib/supabase/share';

/**
 * 항목들을 공유 코드로 만들어 공유 창(카카오톡 등)을 띄운다.
 * 아직 안 한 것·해본 것 모두 보낼 수 있고, 받는 사람에게는 새 버킷리스트로 담긴다
 * (기록·사진은 넘어가지 않는다. 할 것은 위치까지 넘어가고 체크는 풀린다). 실패하면 보여줄 문구를 담은 Error를 던진다.
 */
export async function shareBucketItems(items: BucketItem[], title: string) {
  const code = await createSharedList(
    title,
    items.map((it) => ({
      kind: it.kind,
      title: it.title,
      category: it.category,
      setting: it.setting,
      location: it.location,
      place: it.place ?? null,
      memo: it.memo,
      links: it.links ?? [],
      todos: itemTodos(it).map((t) => ({ ...t, done: false })),
    }))
  );
  const preview = items
    .slice(0, 5)
    .map((it) => `· ${it.title}`)
    .join('\n');
  const more = items.length > 5 ? `\n외 ${items.length - 5}개` : '';
  await Share.share({
    message: [
      'DoIt2 버킷리스트를 공유했어요',
      `'${title}' ${items.length}개`,
      `${preview}${more}`,
      '',
      `공유 코드: ${code}`,
      "DoIt2 앱 버킷리스트 맨 아래 '공유받은 목록 가져오기'에 코드를 넣으면 담을 수 있어요.",
    ].join('\n'),
  });
  return code;
}
