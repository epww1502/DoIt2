/** 갈 곳(장소) / 할 것(같이 해보고 싶은 일) */
export type BucketKind = 'place' | 'activity';

export type CategoryKey =
  // 갈 곳
  | 'food'
  | 'cafe'
  | 'trip'
  | 'activity'
  | 'culture'
  // 할 것
  | 'cook'
  | 'exercise'
  | 'hobby'
  | 'memory'
  | 'event'
  // 공통
  | 'etc';

export type Category = {
  key: CategoryKey;
  label: string;
  emoji: string;
};

export const CATEGORIES_BY_KIND: Record<BucketKind, Category[]> = {
  place: [
    { key: 'food', label: '맛집', emoji: '🍝' },
    { key: 'cafe', label: '카페', emoji: '☕' },
    { key: 'trip', label: '여행', emoji: '✈️' },
    { key: 'activity', label: '액티비티', emoji: '🎡' },
    { key: 'culture', label: '문화생활', emoji: '🎬' },
    { key: 'etc', label: '기타', emoji: '✨' },
  ],
  activity: [
    { key: 'cook', label: '요리', emoji: '🍳' },
    { key: 'exercise', label: '운동', emoji: '🏃' },
    { key: 'hobby', label: '취미/만들기', emoji: '🎨' },
    { key: 'memory', label: '추억 남기기', emoji: '📸' },
    { key: 'event', label: '이벤트', emoji: '🎁' },
    { key: 'etc', label: '기타', emoji: '✨' },
  ],
};

const ALL_CATEGORIES = [
  ...CATEGORIES_BY_KIND.place,
  ...CATEGORIES_BY_KIND.activity,
];

export function getCategory(key: CategoryKey): Category {
  return (
    ALL_CATEGORIES.find((c) => c.key === key) ?? CATEGORIES_BY_KIND.place[5]
  );
}

/** 종류별 화면 문구 */
export const KIND_META: Record<
  BucketKind,
  {
    label: string;
    emoji: string;
    question: string;
    placeholder: string;
    doneLabel: string;
    whenQuestion: string;
    locationLabel: string;
    locationPlaceholder: string;
  }
> = {
  place: {
    label: '갈 곳',
    emoji: '📍',
    question: '어디 가고 싶어요?',
    placeholder: '예) 성수동 그 파스타집',
    doneLabel: '다녀왔어요!',
    whenQuestion: '언제 다녀왔어요?',
    locationLabel: '위치 (선택)',
    locationPlaceholder: '예) 서울 성동구',
  },
  activity: {
    label: '할 것',
    emoji: '✅',
    question: '뭐 같이 해볼까요?',
    placeholder: '예) 같이 생파스타 만들어보기',
    doneLabel: '해냈어요!',
    whenQuestion: '언제 했어요?',
    locationLabel: '장소 (선택)',
    locationPlaceholder: '예) 우리 집, 한강공원',
  },
};

/** 해낸 기록 (다녀온 곳 / 해본 것 공통) */
export type DoneRecord = {
  /** YYYY-MM-DD */
  date: string;
  /** 1~5 */
  rating: number;
  review: string;
  /** 이 휴대폰에 있는 사진 파일 (내가 올린 사진이면 있다) */
  photoUri: string | null;
  /** 서버 사진 저장소 경로 {space_id}/{파일 이름}. 공간에 연결 전이면 없다 */
  photoPath?: string | null;
};

/** 실내 / 실외. 비 오는 날 뽑기에서 실외를 뺄 때 쓴다 */
export type BucketSetting = 'indoor' | 'outdoor';

export const SETTING_META: Record<
  BucketSetting,
  { label: string; emoji: string }
> = {
  indoor: { label: '실내', emoji: '🏠' },
  outdoor: { label: '실외', emoji: '🌳' },
};

/** 카테고리를 고르면 먼저 채워 주는 실내/실외 (담을 때 바꿀 수 있다) */
export const DEFAULT_SETTING: Record<CategoryKey, BucketSetting> = {
  food: 'indoor',
  cafe: 'indoor',
  trip: 'outdoor',
  activity: 'outdoor',
  culture: 'indoor',
  cook: 'indoor',
  exercise: 'outdoor',
  hobby: 'indoor',
  memory: 'outdoor',
  event: 'indoor',
  etc: 'indoor',
};

/** 카카오 장소 검색이나 지도에서 고른 장소 */
export type PlaceInfo = {
  /** 카카오 장소 id. 지도에서 직접 찍은 곳은 없다 */
  kakaoId: string | null;
  name: string;
  /** "이탈리안", "카페" 같은 카카오 카테고리 마지막 단계 */
  category: string;
  /** 도로명 주소 (없으면 지번 주소) */
  address: string;
  latitude: number;
  longitude: number;
};

export type BucketItem = {
  id: string;
  kind: BucketKind;
  title: string;
  category: CategoryKey;
  setting: BucketSetting;
  /** 지역, 주소, 장소 이름 (자유 입력, 선택) */
  location: string;
  /** 카카오에서 고른 장소. 예전 데이터에는 없다 */
  place?: PlaceInfo | null;
  memo: string;
  createdAt: string;
  done: DoneRecord | null;
};

export type BucketInput = Pick<
  BucketItem,
  'kind' | 'title' | 'category' | 'setting' | 'location' | 'place' | 'memo'
>;
