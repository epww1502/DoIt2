import { MapPin } from 'lucide-react-native';
import { Pressable, Text as RNText, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { FONT_WEIGHTS } from '@/constants/fonts';
import { MAP_APPS, type MapApp } from '@/lib/mapLinks';

/** 아이콘 칸 크기 */
const TILE = 52;

/** 지도 앱마다 대표색으로 그린 아이콘 (로고를 그대로 쓰지 않고 색·모양만 따온다) */
function MapAppIcon({ app }: { app: MapApp }) {
  switch (app) {
    case 'kakao':
      return (
        <View
          className="items-center justify-center rounded-2xl"
          style={{ width: TILE, height: TILE, backgroundColor: '#FEE500' }}
        >
          <Icon as={MapPin} size={26} color="#3C1E1E" fill="#3C1E1E" />
          {/* 핀 가운데 구멍 */}
          <View
            className="absolute rounded-full"
            style={{
              width: 8,
              height: 8,
              backgroundColor: '#FEE500',
              top: TILE / 2 - 6,
            }}
          />
        </View>
      );
    case 'naver':
      return (
        <View
          className="items-center justify-center rounded-2xl"
          style={{ width: TILE, height: TILE, backgroundColor: '#03C75A' }}
        >
          <RNText
            style={{
              color: '#FFFFFF',
              fontSize: 26,
              lineHeight: 32,
              fontFamily: FONT_WEIGHTS['900'],
            }}
          >
            N
          </RNText>
        </View>
      );
    case 'google':
      return (
        <View
          className="items-center justify-center rounded-2xl border border-border"
          style={{ width: TILE, height: TILE, backgroundColor: '#FFFFFF' }}
        >
          <Icon as={MapPin} size={26} color="#EA4335" fill="#EA4335" />
          <View
            className="absolute rounded-full"
            style={{
              width: 8,
              height: 8,
              backgroundColor: '#FFFFFF',
              top: TILE / 2 - 6,
            }}
          />
        </View>
      );
  }
}

/** 카카오맵·네이버 지도·구글 지도 열기 버튼 (아이콘 + 아래 작은 이름) */
export function MapAppButtons({ onOpen }: { onOpen: (app: MapApp) => void }) {
  return (
    <View className="flex-row justify-around">
      {MAP_APPS.map((app) => (
        <Pressable
          key={app.key}
          accessibilityRole="button"
          accessibilityLabel={`${app.label}에서 열기`}
          onPress={() => onOpen(app.key)}
          className="items-center gap-1.5 active:opacity-70"
        >
          <MapAppIcon app={app.key} />
          <Text size={12} className="text-muted-foreground">
            {app.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
