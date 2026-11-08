import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronRight,
  Download,
  Heart,
  ImageOff,
  Share2,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  FlatList,
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon, Text } from '@/components/atoms';
import { loadPhotoUrl, usePhotoState } from '@/components/bucket/DonePhoto';
import { usePhotoLikes } from '@/hooks/usePhotoLikes';
import { showAlert } from '@/lib/dialog';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';
import {
  usePhotoViewerStore,
  type ViewerPhoto,
} from '@/store/usePhotoViewerStore';
import { useSpace } from '@/store/useSpaceStore';

/** 두 손가락으로 키울 수 있는 최대 배율 / 두 번 톡 했을 때 배율 */
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * 사진 크게 보기: 옆으로 넘기고, 두 손가락으로 키우고(키운 채로 끌어서 옮기기),
 * 두 번 톡 하면 키우기/되돌리기. 아래 버튼으로 사진 앨범에 저장하거나 공유한다
 */
export default function PhotoViewerScreen() {
  const photos = usePhotoViewerStore((s) => s.photos);
  const start = usePhotoViewerStore((s) => s.index);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);

  const current = photos[index];

  // 함께 쓰는 공간의 기록 사진이면 하트
  const spaceId = useBucketStore((s) => s.spaceId);
  const shared = (useSpace(spaceId)?.memberCount ?? 0) > 1;
  const likes = usePhotoLikes(
    shared ? spaceId : null,
    photos.filter((p) => p.itemId && p.path).map((p) => p.path!)
  );
  const canLike = shared && Boolean(current?.path && current.itemId);

  /** 이 사진이 있는 기록으로 (크게 보기를 닫고 그 기록 화면을 연다) */
  const openRecord = () => {
    if (!current?.itemId) return;
    router.replace({ pathname: '/item/[id]', params: { id: current.itemId } });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) {
      setIndex(next);
      setZoomed(false);
    }
  };

  const save = async () => {
    if (!current || busy) return;
    setBusy('save');
    try {
      const MediaLibrary = await import('expo-media-library');
      const { granted } = await MediaLibrary.requestPermissionsAsync(true);
      if (!granted) {
        showAlert(
          '사진 저장 권한이 필요해요',
          '휴대폰 설정에서 DoIt2의 사진 권한을 허용해주세요.'
        );
        return;
      }
      await MediaLibrary.Asset.create(await photoFileUri(current));
      showAlert('사진 앨범에 저장했어요');
    } catch (e) {
      console.warn('[photo] save', e);
      showAlert(
        '저장하지 못했어요',
        '인터넷 연결을 확인하고 다시 시도해주세요.'
      );
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (!current || busy) return;
    setBusy('share');
    try {
      const [uri, Sharing] = await Promise.all([
        photoFileUri(current),
        import('expo-sharing'),
      ]);
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: '사진 공유하기',
      });
    } catch (e) {
      console.warn('[photo] share', e);
      showAlert(
        '공유하지 못했어요',
        '인터넷 연결을 확인하고 다시 시도해주세요.'
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        // 키운 사진은 옆으로 끌면 사진이 움직여야 해서 넘기기를 멈춘다
        scrollEnabled={!zoomed}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        keyExtractor={(p, i) => p.path ?? p.uri ?? String(i)}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item, index: i }) => (
          <ZoomablePhoto
            photo={item}
            width={width}
            height={height}
            active={i === index}
            zoomed={i === index && zoomed}
            onZoomChange={setZoomed}
          />
        )}
      />

      {/* 위: 닫기 · 몇 번째 · 올린 사람 */}
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 flex-row items-center px-3"
        style={{ top: insets.top + 4 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          hitSlop={8}
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-black/50 active:opacity-70"
        >
          <Icon as={X} size={22} className="text-white" />
        </Pressable>
        <View className="flex-1 items-center" pointerEvents="box-none">
          {photos.length > 1 ? (
            <Text weight="600" size={15} className="text-white">
              {`${index + 1} / ${photos.length}`}
            </Text>
          ) : null}
          {current?.caption ? (
            <Text size={12} className="text-white/80">
              {current.caption}
            </Text>
          ) : null}
          {current?.link && current.itemId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이 사진이 있는 기록 보기"
              hitSlop={6}
              onPress={openRecord}
              className="bg-white/15 mt-1.5 flex-row items-center gap-0.5 rounded-full py-1 pl-3 pr-2 active:opacity-70"
            >
              <Text size={12} weight="600" className="text-white">
                기록 보기
              </Text>
              <Icon as={ChevronRight} size={14} className="text-white" />
            </Pressable>
          ) : null}
        </View>
        <View className="h-10 w-10" />
      </View>

      {/* 아래: 저장 · 공유 */}
      <View
        className="absolute left-0 right-0 flex-row justify-center gap-3 px-5"
        style={{ bottom: insets.bottom + 12 }}
      >
        {canLike && current?.path && current.itemId ? (
          <HeartButton
            liked={likes.likedByMe(current.path)}
            count={likes.countOf(current.path)}
            onPress={() =>
              void likes.toggle(current.path!, current.itemId!, current.by)
            }
          />
        ) : null}
        <ActionButton
          icon={Download}
          label="저장"
          busy={busy === 'save'}
          onPress={() => void save()}
        />
        <ActionButton
          icon={Share2}
          label="공유"
          busy={busy === 'share'}
          onPress={() => void share()}
        />
      </View>
    </GestureHandlerRootView>
  );
}

function ActionButton({
  icon,
  label,
  busy,
  onPress,
}: {
  icon: typeof Download;
  label: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`사진 ${label}하기`}
      onPress={onPress}
      className="bg-white/15 h-12 min-w-[104px] flex-row items-center justify-center gap-2 rounded-full px-5 active:opacity-70"
    >
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Icon as={icon} size={20} className="text-white" />
      )}
      <Text weight="600" size={15} className="text-white">
        {label}
      </Text>
    </Pressable>
  );
}

/** 하트: 누르면 넣기/빼기, 옆에 하트 수 */
function HeartButton({
  liked,
  count,
  onPress,
}: {
  liked: boolean;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={liked ? '하트 빼기' : '하트 누르기'}
      accessibilityState={{ selected: liked }}
      onPress={onPress}
      className="bg-white/15 h-12 flex-row items-center justify-center gap-1.5 rounded-full px-4 active:opacity-70"
    >
      <Icon
        as={Heart}
        size={20}
        className={cn(liked ? 'text-red-500' : 'text-white')}
        fill={liked ? '#ef4444' : 'transparent'}
      />
      {count > 0 ? (
        <Text weight="600" size={15} className="text-white">
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** 한 장: 두 손가락으로 키우기, 키운 채로 끌어서 옮기기, 두 번 톡 하면 키우기/되돌리기 */
function ZoomablePhoto({
  photo,
  width,
  height,
  active,
  zoomed,
  onZoomChange,
}: {
  photo: ViewerPhoto;
  width: number;
  height: number;
  active: boolean;
  /** 지금 키워 둔 상태인지 (화면이 들고 있다. 옆 사진으로 넘기면 풀린다) */
  zoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const { uri, failed, retry } = usePhotoState(photo.uri, photo.path);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const report = (next: boolean) => onZoomChange(next);

  // 다른 사진으로 넘어가면 원래 크기로
  useEffect(() => {
    if (active) return;
    scale.set(1);
    savedScale.set(1);
    x.set(0);
    y.set(0);
    savedX.set(0);
    savedY.set(0);
  }, [active, scale, savedScale, x, y, savedX, savedY]);

  const pinch = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      const next = Math.min(MAX_SCALE, Math.max(1, savedScale.get() * e.scale));
      scale.set(next);
      x.set(clampOffset(savedX.get(), next, width));
      y.set(clampOffset(savedY.get(), next, height));
    },
    onDeactivate: () => {
      'worklet';
      if (scale.get() < 1.05) {
        scale.set(withTiming(1));
        x.set(withTiming(0));
        y.set(withTiming(0));
        savedScale.set(1);
        savedX.set(0);
        savedY.set(0);
        scheduleOnRN(report, false);
      } else {
        savedScale.set(scale.get());
        savedX.set(x.get());
        savedY.set(y.get());
        scheduleOnRN(report, true);
      }
    },
  });

  // 키웠을 때만 한 손가락으로 사진을 옮긴다 (아니면 옆 사진으로 넘긴다)
  const pan = usePanGesture({
    enabled: zoomed,
    onUpdate: (e) => {
      'worklet';
      x.set(clampOffset(savedX.get() + e.translationX, scale.get(), width));
      y.set(clampOffset(savedY.get() + e.translationY, scale.get(), height));
    },
    onDeactivate: () => {
      'worklet';
      savedX.set(x.get());
      savedY.set(y.get());
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      'worklet';
      const zoomIn = savedScale.get() <= 1;
      const next = zoomIn ? DOUBLE_TAP_SCALE : 1;
      scale.set(withTiming(next));
      x.set(withTiming(0));
      y.set(withTiming(0));
      savedScale.set(next);
      savedX.set(0);
      savedY.set(0);
      scheduleOnRN(report, zoomIn);
    },
  });

  const gesture = useSimultaneousGestures(pinch, pan, doubleTap);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: scale.get() },
    ],
  }));

  if (failed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="사진 다시 불러오기"
        onPress={retry}
        className="items-center justify-center gap-2"
        style={{ width, height }}
      >
        <Icon as={ImageOff} size={28} className="text-white/70" />
        <Text size={13} className="text-white/70">
          사진을 불러오지 못했어요 · 눌러서 다시 시도
        </Text>
      </Pressable>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[{ width, height, justifyContent: 'center' }, style]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width, height }}
            contentFit="contain"
            transition={150}
          />
        ) : (
          <ActivityIndicator color="#fff" />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

/** 키운 사진이 화면 밖으로 너무 나가지 않게 옮긴 거리를 줄인다 */
function clampOffset(value: number, scale: number, size: number) {
  'worklet';
  const max = (size * (scale - 1)) / 2;
  return Math.min(max, Math.max(-max, value));
}

/**
 * 저장·공유할 사진 파일. 이 폰에 있는 사진이면 그 파일을,
 * 다른 사람이 올린 사진이면 임시 폴더에 내려받는다
 */
async function photoFileUri(photo: ViewerPhoto) {
  if (photo.uri) return photo.uri;
  if (!photo.path) throw new Error('no photo');
  const url = await loadPhotoUrl(photo.path);
  const folder = new Directory(Paths.cache, 'viewer');
  folder.create({ idempotent: true, intermediates: true });
  const name = photo.path.split('/').pop() ?? `${Date.now()}.jpg`;
  const target = new File(folder, name);
  if (target.exists) return target.uri;
  const file = await File.downloadFileAsync(url, target, { idempotent: true });
  return file.uri;
}
