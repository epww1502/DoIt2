import { toggleGroup } from '@/lib/pushPrefs';

jest.mock('@/lib/supabase/client', () => ({ supabase: {} }));

describe('toggleGroup', () => {
  it('끄면 목록에 넣고, 켜면 뺀다', () => {
    expect(toggleGroup([], 'comment', false)).toEqual(['comment']);
    expect(toggleGroup(['comment', 'like'], 'comment', true)).toEqual(['like']);
  });

  it('같은 묶음을 두 번 꺼도 한 번만 들어간다', () => {
    expect(toggleGroup(['like'], 'like', false)).toEqual(['like']);
  });
});
