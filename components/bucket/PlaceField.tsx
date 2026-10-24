import { MapPin, Search, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text, TextField } from '@/components/atoms';
import type { PlaceInfo } from '@/lib/bucket/types';

import { FieldLabel } from './FieldLabel';

type PlaceFieldProps = {
  label: string;
  /** 직접 적기 칸의 예시 */
  placeholder: string;
  /** 카카오에서 고른 장소 */
  place: PlaceInfo | null;
  /** 직접 적은 위치 (고른 장소가 있으면 주소) */
  location: string;
  onChangeLocation: (text: string) => void;
  /** 장소 검색·지도 화면 열기 */
  onSearch: () => void;
  onClear: () => void;
  onFocus?: () => void;
};

/** 장소: 고른 장소가 있으면 이름·주소 + 바꾸기/지우기, 없으면 찾기 버튼 + 직접 적기 */
export function PlaceField({
  label,
  placeholder,
  place,
  location,
  onChangeLocation,
  onSearch,
  onClear,
  onFocus,
}: PlaceFieldProps) {
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      {place ? (
        <View className="flex-row items-center gap-3 rounded-xl px-4 py-3 bg-accent">
          <Icon as={MapPin} size={18} className="text-primary" />
          <View className="flex-1 gap-0.5">
            <Text weight="600" size={15} numberOfLines={1}>
              {place.name}
            </Text>
            <Text variant="muted" size={12} numberOfLines={1}>
              {place.address}
            </Text>
          </View>
          <Pressable accessibilityRole="button" hitSlop={6} onPress={onSearch}>
            <Text weight="600" size={13} className="text-primary">
              바꾸기
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="장소 지우기"
            hitSlop={6}
            onPress={onClear}
          >
            <Icon as={X} size={18} className="text-muted-foreground" />
          </Pressable>
        </View>
      ) : (
        <View className="gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={onSearch}
            className="h-12 flex-row items-center gap-2 rounded-xl px-4 bg-accent active:opacity-70"
          >
            <Icon as={Search} size={18} className="text-primary" />
            <Text weight="600" size={15} className="text-primary">
              장소 찾기 · 지도에서 고르기
            </Text>
          </Pressable>
          <TextField
            value={location}
            onChangeText={onChangeLocation}
            placeholder={`또는 직접 적기: ${placeholder.replace('예) ', '')}`}
            maxLength={40}
            onFocus={onFocus}
          />
        </View>
      )}
    </View>
  );
}
