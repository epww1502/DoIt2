/** 탐방(가보고 싶은 장소) / 도전(해보고 싶은 일) */
export type BucketKind = 'place' | 'activity';

export type CategoryKey =
  // 탐방
  | 'food'
  | 'cafe'
  | 'trip'
  | 'activity'
  | 'culture'
  // 도전
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
    label: '탐방',
    emoji: '📍',
    question: '어디 가고 싶어요?',
    placeholder: '예) 성수동 그 파스타집',
    doneLabel: '탐방 완료',
    whenQuestion: '언제 탐방했어요?',
    locationLabel: '위치 (선택)',
    locationPlaceholder: '예) 서울 성동구',
  },
  activity: {
    label: '도전',
    emoji: '✨',
    question: '뭐 같이 해볼까요?',
    placeholder: '예) 같이 생파스타 만들어보기',
    doneLabel: '도전 성공',
    whenQuestion: '언제 도전했어요?',
    locationLabel: '장소 (선택)',
    locationPlaceholder: '예) 우리 집, 한강공원',
  },
};

/** 함께한 기록 (가본 곳 / 해본 것 공통) */
export type DoneRecord = {
  /** YYYY-MM-DD */
  date: string;
  /** 시작하기로 시작한 날 (YYYY-MM-DD). 바로 해낸 기록에는 없다 */
  startDate?: string | null;
  /** 1~5 */
  rating: number;
  review: string;
  /** 쓴 돈 (원). 공간에서는 함께 쓴 돈. 안 적었으면 없다 */
  cost?: number | null;
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

/** 기록 하나에 넣을 수 있는 사진 수 ('나만 보기'). 공간에서는 한 사람이 넣을 수 있는 수 */
export const MAX_RECORD_PHOTOS = 5;

/** 공간: 기록 하나에 모두 합쳐 넣을 수 있는 사진 수 (사람이 많아도 용량이 너무 커지지 않게) */
export const MAX_SHARED_RECORD_PHOTOS = 15;

/** 버킷리스트 항목 하나에 넣을 수 있는 사진 수 */
export const MAX_ITEM_PHOTOS = 3;

/** 항목 사진들 (첫 번째가 대표). 사진이 없으면 빈 목록 */
export function itemPhotos(
  item: Pick<BucketItem, 'photos'> | null | undefined
): RecordPhoto[] {
  return (item?.photos ?? []).filter((p) => p.uri || p.path);
}

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
  /** 항목 사진 (최대 MAX_ITEM_PHOTOS). 첫 번째가 대표 사진이고 목록에서 이모지 대신 보인다 */
  photos?: RecordPhoto[];
  /** 할 것 체크리스트 (예: '용산 가기' 안의 '아이파크몰 구경', '용리단길 맛집'). 없으면 빈 목록 */
  todos?: ItemTodo[];
  createdAt: string;
  /** 공간 항목을 담은 사람 (서버에서 받은 항목만. '나만 보기'는 없다) */
  createdBy?: string | null;
  /** 함께한 기록(날짜·사진). 공간에서는 별점·소감은 reviews에 사람마다 따로 있다 */
  done: DoneRecord | null;
  /** 공간 항목: 사람마다 남긴 별점·소감 ('나만 보기'에는 없다) */
  reviews?: ItemReview[];
  /** 목표 날짜 (선택). 정하지 않았으면 없다 */
  goal?: GoalInfo | null;
  /** 공간 항목의 댓글 수 (목록에 말풍선 숫자로) */
  commentCount?: number;
  /** 매년 하기 (예: 벚꽃 구경). 해내면 다음 해 것이 '쉬는 중'으로 새로 담긴다 */
  repeat?: RepeatInfo | null;
  /** 시작하기를 눌러 진행 중 (해내면 시작일은 done.startDate로 옮겨 간다) */
  started?: StartedInfo | null;
};

export type StartedInfo = {
  /** YYYY-MM-DD */
  date: string;
};

/** 아직 해내지 않았고 시작한 항목 */
export function isInProgress(item: Pick<BucketItem, 'done' | 'started'>) {
  return !item.done && !!item.started;
}

/** 시작한 날부터 며칠째인지 (시작한 날이 1일째) */
export function dayCount(from: string, to: string) {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

/**
 * 매년 하기. restUntil이 있으면 그날 전까지는 목록·뽑기에 안 보이고 쉰다
 * (작년에 한 날의 한 달 전에 다시 올라온다)
 */
export type RepeatInfo = {
  every: 'year';
  /** YYYY-MM-DD. 이날부터 다시 보인다 */
  restUntil?: string | null;
};

/** 다시 올라올 날: 한 날로부터 1년 뒤의 한 달 전 (적어도 내일) */
export function nextRestUntil(doneDate: string, today: string) {
  const d = new Date(`${doneDate}T00:00:00`);
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 30);
  const until = ymd(d);
  const t = new Date(`${today}T00:00:00`);
  t.setDate(t.getDate() + 1);
  const tomorrow = ymd(t);
  return until > tomorrow ? until : tomorrow;
}

function ymd(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 매년 하기 항목이 아직 쉬는 중인지 (오늘은 YYYY-MM-DD) */
export function isResting(
  item: Pick<BucketItem, 'done' | 'repeat'>,
  today: string
) {
  const until = item.repeat?.restUntil;
  return !item.done && !!until && until > today;
}

/** 항목 안의 할 것 한 줄 */
export type ItemTodo = {
  id: string;
  text: string;
  done: boolean;
  /** 할 것마다 고른 장소 (나중에 쓰려고 자리만 둔다) */
  place?: PlaceInfo | null;
};

/** 할 것 목록 (예전 데이터·이상한 값은 걸러낸다) */
export function itemTodos(
  item: Pick<BucketItem, 'todos'> | null | undefined
): ItemTodo[] {
  return (item?.todos ?? []).filter(
    (t) => t && typeof t.text === 'string' && t.text.trim() !== ''
  );
}

/** 새 할 것 id (항목 안에서만 겹치지 않으면 된다) */
/**
 * 할 것 하나만 바꾸는 변경 (공간에서 서버에 이것만 보낸다).
 * 목록 전체를 덮어쓰지 않아서 두 사람이 동시에 체크해도 서로 지우지 않는다.
 */
export type TodoOp =
  | { type: 'check'; todoId: string; done: boolean }
  | { type: 'add'; todo: ItemTodo };

/** 할 것 목록에 변경을 차례로 반영한다 (서버 apply_item_todo_ops와 같은 규칙) */
export function applyTodoOps(todos: ItemTodo[], ops: TodoOp[]): ItemTodo[] {
  let next = todos;
  for (const op of ops) {
    if (op.type === 'check') {
      next = next.map((t) =>
        t.id === op.todoId ? { ...t, done: op.done } : t
      );
    } else if (!next.some((t) => t.id === op.todo.id) && next.length < 30) {
      next = [...next, op.todo];
    }
  }
  return next;
}

export function newTodoId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** 목표 날짜 알림 시점: 일주일 전, 하루 전, 당일 아침 */
export type GoalRemind = 'week' | 'day' | 'morning';

export type GoalInfo = {
  /** YYYY-MM-DD */
  date: string;
  /** 알림 받을 시점들 (없으면 알림 없이 날짜만) */
  remind: GoalRemind[];
};

export const GOAL_REMIND_META: Record<
  GoalRemind,
  { label: string; daysBefore: number; hour: number }
> = {
  week: { label: '일주일 전', daysBefore: 7, hour: 10 },
  day: { label: '하루 전', daysBefore: 1, hour: 20 },
  morning: { label: '당일 아침', daysBefore: 0, hour: 9 },
};

/** 새로 목표 날짜를 켤 때 기본 알림 */
export const DEFAULT_GOAL_REMIND: GoalRemind[] = ['day', 'morning'];

/** 한 사람의 평가. rating이 null이면 평가를 건너뛰었다 */
export type ItemReview = {
  userId: string;
  rating: number | null;
  review: string;
  updatedAt: string;
  /** 처음 남긴 시각. 예전에 폰에 저장된 평가에는 없다 */
  createdAt?: string;
  /** 이 사람이 올린 기록 사진 (최대 MAX_RECORD_PHOTOS). 없으면 빈 목록이나 없음 */
  photos?: RecordPhoto[];
};

export type BucketInput = Pick<
  BucketItem,
  | 'kind'
  | 'title'
  | 'category'
  | 'setting'
  | 'location'
  | 'place'
  | 'memo'
  | 'goal'
  | 'photos'
  | 'todos'
  | 'repeat'
  | 'started'
>;
