import { QUICK_REACTION_EMOJIS, REACTION_EMOJIS } from '@/lib/bucket/reactions';

describe('이모지 반응 목록', () => {
  it('앱의 목록과 서버가 받아 주는 목록이 같다 (다르면 고른 이모지가 저장되지 않는다)', () => {
    // 프로젝트에 node 타입이 없어서 fs를 jest로 불러온다 (테스트는 프로젝트 폴더에서 돈다)
    const { readFileSync } = jest.requireActual('fs') as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    const sql = readFileSync(
      'supabase/migrations/20261113150000_more_reaction_emojis.sql',
      'utf8'
    );
    const lists = [...sql.matchAll(/check \(emoji in \(([^)]*)\)\)/g)].map(
      (m) => m[1].split(',').map((part) => part.trim().replace(/^'|'$/g, ''))
    );
    // 항목 반응, 댓글 반응
    expect(lists).toHaveLength(2);
    for (const list of lists) expect(list).toEqual([...REACTION_EMOJIS]);
  });

  it('같은 이모지가 두 번 들어가지 않는다', () => {
    expect(new Set(REACTION_EMOJIS).size).toBe(REACTION_EMOJIS.length);
  });

  it('예전 앱이 아는 6개가 맨 앞에 그대로 있다', () => {
    expect(QUICK_REACTION_EMOJIS).toEqual(['❤️', '👍', '😆', '🔥', '🥹', '👏']);
  });
});
