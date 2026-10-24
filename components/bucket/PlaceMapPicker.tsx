import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Text } from '@/components/atoms';
import { colors } from '@/constants/colors';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import type { PlaceInfo } from '@/lib/bucket/types';
import { getKakaoAddress } from '@/lib/kakao';
import { usePrimaryColor } from '@/store/useSettingsStore';

/** 위치를 모를 때 처음 보여줄 곳: 서울시청 */
const DEFAULT_REGION: Region = {
  latitude: 37.5663,
  longitude: 126.9779,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};
/** 내 위치로 옮길 때 보여줄 범위 (동네 정도) */
const NEARBY_DELTA = 0.01;
/** 검색 결과가 다 보이게 맞출 때 가장자리 여백 */
const FIT_PADDING = { top: 60, right: 40, bottom: 220, left: 40 };
/** 핀을 누르면 지도 누르기 이벤트도 같이 오는 경우가 있어서, 이 시간 안의 지도 누르기는 무시한다 */
const MARKER_PRESS_GUARD_MS = 400;

type PlaceMapPickerProps = {
  /** 검색 결과. 핀으로 보여준다 */
  results: PlaceInfo[];
  onPick: (place: PlaceInfo) => void;
};

/**
 * 지도에서 장소 고르기.
 * - 검색 결과 핀을 누르면 그 장소를 고를 수 있다.
 * - 핀을 고르지 않았으면 화면 가운데 핀 위치를 고른다 (주소는 카카오에서 찾는다).
 */
export function PlaceMapPicker({ results, onPick }: PlaceMapPickerProps) {
  const { colorScheme } = useThemeMode();
  const primary = usePrimaryColor();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const lastMarkerPress = useRef(0);

  const [selected, setSelected] = useState<PlaceInfo | null>(null);
  const [center, setCenter] = useState({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [resolving, setResolving] = useState(false);

  // 검색 결과가 있으면 다 보이게, 없으면 내 위치로 옮긴다 (권한이 이미 있을 때만)
  useEffect(() => {
    if (results.length > 0) {
      mapRef.current?.fitToCoordinates(results, {
        edgePadding: FIT_PADDING,
        animated: true,
      });
      return;
    }
    let cancelled = false;
    (async () => {
      const { granted } = await Location.getForegroundPermissionsAsync();
      if (!granted || cancelled) return;
      const pos = await Location.getLastKnownPositionAsync();
      if (!pos || cancelled) return;
      mapRef.current?.animateToRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: NEARBY_DELTA,
        longitudeDelta: NEARBY_DELTA,
      });
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [results]);

  const pickCenter = async () => {
    setResolving(true);
    try {
      const { address, buildingName } = await getKakaoAddress(
        center.latitude,
        center.longitude
      );
      onPick({
        kakaoId: null,
        name: buildingName || '지도에서 고른 곳',
        category: '',
        address: address || '주소를 찾지 못한 곳',
        latitude: center.latitude,
        longitude: center.longitude,
      });
    } catch {
      Alert.alert(
        '주소를 찾지 못했어요',
        '인터넷 연결을 확인하고 다시 시도해주세요.'
      );
    } finally {
      setResolving(false);
    }
  };

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton
        toolbarEnabled={false}
        userInterfaceStyle={colorScheme}
        onRegionChangeComplete={(region) =>
          setCenter({ latitude: region.latitude, longitude: region.longitude })
        }
        onPress={() => {
          if (Date.now() - lastMarkerPress.current < MARKER_PRESS_GUARD_MS) {
            return;
          }
          setSelected(null);
        }}
      >
        {results.map((place) => {
          const isSelected = selected === place;
          return (
            <Marker
              key={place.kakaoId ?? `${place.latitude},${place.longitude}`}
              coordinate={place}
              pinColor={isSelected ? primary : undefined}
              onPress={() => {
                lastMarkerPress.current = Date.now();
                setSelected(place);
              }}
            />
          );
        })}
      </MapView>

      {/* 가운데 핀: 핀 끝이 정확히 지도 가운데를 가리키도록 아이콘 높이만큼 올린다 */}
      {!selected ? (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
        >
          <View style={{ marginBottom: 36 }}>
            <Icon
              as={MapPin}
              size={36}
              className="text-primary"
              fill={colors.white}
            />
          </View>
        </View>
      ) : null}

      <View
        className="absolute bottom-0 left-0 right-0 gap-3 rounded-t-3xl px-5 pt-4 bg-background"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {selected ? (
          <>
            <View className="gap-0.5">
              <Text weight="700" size={17} numberOfLines={1}>
                {selected.name}
              </Text>
              <Text variant="muted" size={13} numberOfLines={1}>
                {[selected.category, selected.address]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Button label="이 장소로 고르기" onPress={() => onPick(selected)} />
          </>
        ) : (
          <>
            <Text variant="muted" size={13}>
              {results.length > 0
                ? '핀을 눌러 고르거나, 지도를 움직여 가운데 핀을 맞춰요'
                : '지도를 움직여 가운데 핀을 원하는 곳에 맞춰요'}
            </Text>
            <Button
              label={resolving ? '주소 찾는 중…' : '이 위치로 고르기'}
              disabled={resolving}
              onPress={() => void pickCenter()}
            />
          </>
        )}
      </View>
    </View>
  );
}
