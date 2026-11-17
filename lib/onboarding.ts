/**
 * 처음 켰을 때 묻는 것들 (app/welcome.tsx).
 * '공간'이라는 말을 몰라도 되게, 누구와 쓸지만 묻고 이름·아이콘은 여기 정해 둔 값으로 만든다.
 */
import { type AiDraft, draftToInput } from '@/lib/bucket/aiDraft';
import type { BucketInput } from '@/lib/bucket/types';

export type WhoKey = 'couple' | 'friends' | 'family' | 'solo';

export type WhoOption = {
  key: WhoKey;
  label: string;
  /** 고르는 칸에 보이는 그림 */
  emoji: string;
  detail: string;
  /** 만들어 줄 공간의 이름과 아이콘 (혼자 쓰면 공간을 만들지 않고 이 폰에만 둔다) */
  spaceName: string;
  spaceEmoji: string;
};

export const WHO_OPTIONS: WhoOption[] = [
  {
    key: 'couple',
    label: '연인과',
    emoji: '💑',
    detail: '둘이 가고 싶은 곳을 같이 모아요',
    spaceName: '우리 둘',
    spaceEmoji: '🧑‍🤝‍🧑',
  },
  {
    key: 'friends',
    label: '친구와',
    emoji: '👯',
    detail: '모임에서 하고 싶은 걸 같이 정해요',
    spaceName: '우리 친구들',
    spaceEmoji: '👯',
  },
  {
    key: 'family',
    label: '가족과',
    emoji: '👨‍👩‍👧',
    detail: '가족 나들이와 여행을 같이 계획해요',
    spaceName: '우리 가족',
    spaceEmoji: '👨‍👩‍👧',
  },
  {
    key: 'solo',
    label: '혼자',
    emoji: '🙋',
    detail: '나만의 버킷리스트를 써요. 나중에 같이 쓸 수도 있어요',
    spaceName: '',
    spaceEmoji: '',
  },
];

const place = (
  title: string,
  category: AiDraft['category'],
  setting: AiDraft['setting']
): AiDraft => ({ title, kind: 'place', category, setting });
const activity = (
  title: string,
  category: AiDraft['category'],
  setting: AiDraft['setting']
): AiDraft => ({ title, kind: 'activity', category, setting });

/** 처음에 눌러서 담을 수 있는 예시 (누구와 쓰는지에 따라) */
export const STARTERS: Record<WhoKey, AiDraft[]> = {
  couple: [
    place('분위기 좋은 맛집 가기', 'food', 'indoor'),
    place('바다 보러 가기', 'trip', 'outdoor'),
    place('전시회 보러 가기', 'culture', 'indoor'),
    place('놀이공원 가기', 'activity', 'outdoor'),
    activity('같이 요리하기', 'cook', 'indoor'),
    activity('커플 사진 찍기', 'memory', 'indoor'),
    place('한강 피크닉', 'trip', 'outdoor'),
    activity('원데이 클래스 듣기', 'hobby', 'indoor'),
  ],
  friends: [
    place('맛집 탐방', 'food', 'indoor'),
    place('당일치기 여행', 'trip', 'outdoor'),
    place('방탈출 하기', 'activity', 'indoor'),
    place('캠핑 가기', 'trip', 'outdoor'),
    place('보드게임 카페 가기', 'activity', 'indoor'),
    activity('우정 사진 찍기', 'memory', 'indoor'),
    activity('홈파티 하기', 'event', 'indoor'),
    place('페스티벌 가기', 'culture', 'outdoor'),
  ],
  family: [
    place('가족 여행 가기', 'trip', 'outdoor'),
    place('놀이공원 가기', 'activity', 'outdoor'),
    place('동물원 가기', 'activity', 'outdoor'),
    activity('가족사진 찍기', 'memory', 'indoor'),
    place('캠핑 가기', 'trip', 'outdoor'),
    activity('같이 요리하기', 'cook', 'indoor'),
    place('맛있는 외식 하기', 'food', 'indoor'),
    place('박물관 가기', 'culture', 'indoor'),
  ],
  solo: [
    place('혼자 여행 가기', 'trip', 'outdoor'),
    place('가고 싶던 맛집 가기', 'food', 'indoor'),
    activity('새 운동 시작하기', 'exercise', 'indoor'),
    place('전시회 보러 가기', 'culture', 'indoor'),
    activity('원데이 클래스 듣기', 'hobby', 'indoor'),
    place('가보고 싶던 카페 가기', 'cafe', 'indoor'),
    activity('등산 가기', 'exercise', 'outdoor'),
    activity('책 한 권 끝까지 읽기', 'hobby', 'indoor'),
  ],
};

/** 직접 쓰는 이름의 길이 (항목 이름과 같다) */
export const STARTER_TITLE_MAX = 40;
/** '직접 해보기'에서 넣을 수 있는 할 것 수 (더 넣고 싶으면 담은 뒤 항목에서) */
export const GUIDED_TODO_MAX = 3;

/** '직접 해보기'로 만든 것 (components/bucket/GuidedAdd.tsx) */
export type GuidedItem = AiDraft & { todos: string[] };

/** 시작 화면에서 고르거나 직접 만든 것을 addItems에 넣을 모양으로 */
export function starterToInput(
  starter: AiDraft | GuidedItem,
  newId: () => string
): BucketInput {
  const todos = 'todos' in starter ? starter.todos : [];
  return {
    ...draftToInput({
      title: starter.title,
      kind: starter.kind,
      category: starter.category,
      setting: starter.setting,
    }),
    ...(todos.length > 0
      ? { todos: todos.map((text) => ({ id: newId(), text, done: false })) }
      : {}),
  };
}

/**
 * 복사해 둔 글에서 초대 코드를 찾는다. 못 찾으면 빈 글자.
 * - 초대 글·초대 페이지가 복사해 주는 "초대 코드: ABC123"
 * - 초대 링크의 c=ABC123
 * - 코드만 복사한 경우 (영문·숫자 6자리)
 * 아무 글에서나 6자리를 뽑으면 엉뚱한 코드가 들어가서, 이 세 모양만 본다.
 */
export function inviteCodeFromText(text: string | null | undefined) {
  const raw = (text ?? '').trim();
  if (!raw) return '';
  const labeled = /초대\s*코드\s*[:：]?\s*([A-Za-z0-9]{6})(?![A-Za-z0-9])/.exec(
    raw
  );
  if (labeled) return labeled[1].toUpperCase();
  const linked = /[?&]c=([A-Za-z0-9]{6})(?![A-Za-z0-9])/.exec(raw);
  if (linked) return linked[1].toUpperCase();
  return /^[A-Za-z0-9]{6}$/.test(raw) ? raw.toUpperCase() : '';
}

/**
 * 처음 켠 사람인지: 시작 화면을 본 적 없고, 공간도 담은 것도 없을 때.
 * 업데이트 전부터 쓰던 사람은 본 적 없다고 나오지만, 공간이나 담은 것이 있으니 걸리지 않는다.
 */
export function needsWelcome(state: {
  welcomed: boolean;
  /** 로그인·공간 확인이 끝났는지 (끝나기 전에는 공간이 없는 것처럼 보인다) */
  settled: boolean;
  spaceCount: number;
  itemCount: number;
}) {
  return (
    !state.welcomed &&
    state.settled &&
    state.spaceCount === 0 &&
    state.itemCount === 0
  );
}
