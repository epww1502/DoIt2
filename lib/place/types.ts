export type CategoryKey =
  'food' | 'cafe' | 'trip' | 'activity' | 'culture' | 'etc';

export type Category = {
  key: CategoryKey;
  label: string;
  emoji: string;
};

export const CATEGORIES: Category[] = [
  { key: 'food', label: '맛집', emoji: '🍝' },
  { key: 'cafe', label: '카페', emoji: '☕' },
  { key: 'trip', label: '여행', emoji: '✈️' },
  { key: 'activity', label: '액티비티', emoji: '🎡' },
  { key: 'culture', label: '문화생활', emoji: '🎬' },
  { key: 'etc', label: '기타', emoji: '✨' },
];

export function getCategory(key: CategoryKey): Category {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[5];
}

/** 다녀온 기록 */
export type Visit = {
  /** YYYY-MM-DD */
  date: string;
  /** 1~5 */
  rating: number;
  review: string;
  photoUri: string | null;
};

export type Place = {
  id: string;
  title: string;
  category: CategoryKey;
  /** 지역이나 주소 (자유 입력) */
  location: string;
  memo: string;
  createdAt: string;
  visit: Visit | null;
};

export type PlaceInput = Pick<
  Place,
  'title' | 'category' | 'location' | 'memo'
>;
