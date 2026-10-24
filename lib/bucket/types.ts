/** 가보기(장소) / 해보기(같이 해보고 싶은 일) */
export type BucketKind = 'place' | 'activity';

export type CategoryKey =
  // 가보기
  | 'food'
  | 'cafe'
  | 'trip'
  | 'activity'
  | 'culture'
  // 해보기
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
    label: '가보기',
    emoji: '📍',
    question: '어디 가고 싶어요?',
    placeholder: '예) 성수동 그 파스타집',
    doneLabel: '가봤어요',
    whenQuestion: '언제 가봤어요?',
    locationLabel: '위치 (선택)',
    locationPlaceholder: '예) 서울 성동구',
  },
  activity: {
    label: '해보기',
    emoji: '✅',
    question: '뭐 같이 해볼까요?',
    placeholder: '예) 같이 생파스타 만들어보기',
    doneLabel: '해봤어요',
    whenQuestion: '언제 해봤어요?',
    locationLabel: '장소 (선택)',
    locationPlaceholder: '예) 우리 집, 한강공원',
  },
};

/** 함께한 기록 (가본 곳 / 해본 것 공통) */
export type DoneRecord = {
  /** YYYY-MM-DD */
  date: string;
  /** 1~5 */
  rating: number;
  review: string;
  /**
   * 첫 번째 사진 (이 휴대폰 파일). 사진이 여러 장이 된 뒤에도 예전 앱이 첫 장을
   * 보여줄 수 있게 photos[0]과 같게 맞춰 둔다
   */
  photoUri: string | null;
  /** 첫 번째 사진의 서버 저장소 경로 {space_id}/{파일 이름}. 공간에 연결 전이면 없다 */
  photoPath?: string | null;
  /** 사진 여러 장 (최대 MAX_RECORD_PHOTOS). 예전 기록에는 없고 photoUri/photoPath 한 장만 있다 */
  photos?: RecordPhoto[];
};

/** 기록 사진 한 장. uri: 이 휴대폰 파일(내가 올린 사진), path: 서버 경로 */
export type RecordPhoto = { uri: string | null; path: string | null };

/** 기록 하나에 넣을 수 있는 사진 수 */
export const MAX_RECORD_PHOTOS = 5;

/** 기록의 사진들 (예전 한 장짜리 기록도 목록으로) */
export function recordPhotos(
  done: Pick<DoneRecord, 'photoUri' | 'photoPath' | 'photos'> | null | undefined
): RecordPhoto[] {
  if (!done) return [];
  if (done.photos) return done.photos.filter((p) => p.uri || p.path);
  if (done.photoUri || done.photoPath) {
    return [{ uri: done.photoUri ?? null, path: done.photoPath ?? null }];
  }
  return [];
}

/** 사진 목록을 넣고, 예전 앱용 첫 장(photoUri/photoPath)도 맞춘다 */
export function withRecordPhotos(
  done: DoneRecord,
  photos: RecordPhoto[]
): DoneRecord {
  const first = photos[0];
  return {
    ...done,
    photos,
    photoUri: first?.uri ?? null,
    photoPath: first?.path ?? null,
  };
}

/** 실내 / 실외. 비 오는 날 뽑기에서 실외를 뺄 때 쓴다 */
export type BucketSetting = 'indoor' | 'outdoor';

export const SETTING_META: Record<
  BucketSetting,
  { label: string; emoji: string }
> = {
  indoor: { label: '실내', emoji: '🏠' },
  outdoor: { label: '실외', emoji: '🌳' },
};

/** 목록에 붙이는 짧은 표시: '실내' / '실외' */
export function settingTag(setting: BucketSetting) {
  return (SETTING_META[setting] ?? SETTING_META.indoor).label;
}

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
  /** 함께한 기록(날짜·사진). 공간에서는 별점·소감은 reviews에 사람마다 따로 있다 */
  done: DoneRecord | null;
  /** 공간 항목: 사람마다 남긴 별점·소감 ('나만 보기'에는 없다) */
  reviews?: ItemReview[];
};

/** 한 사람의 평가. rating이 null이면 평가를 건너뛰었다 */
export type ItemReview = {
  userId: string;
  rating: number | null;
  review: string;
  updatedAt: string;
};

export type BucketInput = Pick<
  BucketItem,
  'kind' | 'title' | 'category' | 'setting' | 'location' | 'place' | 'memo'
>;
