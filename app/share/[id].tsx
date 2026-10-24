import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ScrollView,
  Text as RNText,
  View,
  type ViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, NavBar, Text } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { usePhotoSource } from '@/components/bucket/DonePhoto';
import { EmptyState } from '@/components/bucket/EmptyState';
import { FONT_WEIGHTS } from '@/constants/fonts';
import { getCategory, KIND_META, recordPhotos } from '@/lib/bucket/types';
import { showAlert } from '@/lib/dialog';
import { useBucketItem, useBucketStore } from '@/store/useBucketStore';
import { usePrimaryColor } from '@/store/useSettingsStore';
import { useSpace } from '@/store/useSpaceStore';

/** 카드 크기 (공유 이미지는 이 크기의 3배로 저장된다) */
const CARD_WIDTH = 320;
const CARD_HEIGHT = 400;
/** 카드는 다크 모드와 상관없이 늘 같은 색으로 */
const CARD_BG = '#FFFFFF';
const CARD_TEXT = '#191F28';
const CARD_MUTED = '#8B95A1';

/** 함께한 기록을 예쁜 카드 이미지로 만들어 공유한다 */
export default function ShareCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useBucketItem(id);
  const spaceId = useBucketStore((s) => s.spaceId);
  const space = useSpace(spaceId);
  const primary = usePrimaryColor();
  const cardRef = useRef<ViewInstance>(null);
  const [sharing, setSharing] = useState(false);

  const done = item?.done;
  const photo = recordPhotos(done)[0];
  const photoUri = usePhotoSource(photo?.uri, photo?.path);
  // 사진이 있으면 다 그려진 뒤에 찍어야 빈칸이 안 나온다
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const ready = !photo || photoLoaded;

  if (!item || !done) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title="공유 카드" />
        <EmptyState
          title="공유할 기록이 없어요"
          description="기록을 남긴 항목에서 만들 수 있어요."
        />
      </SafeAreaView>
    );
  }

  const category = getCategory(item.category);

  const share = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      // 네이티브 부품이 없는 예전 앱에서 멈추지 않게, 쓸 때만 불러온다
      const [{ captureRef }, Sharing] = await Promise.all([
        import('react-native-view-shot'),
        import('expo-sharing'),
      ]);
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: CARD_WIDTH * 3,
        height: CARD_HEIGHT * 3,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: '함께한 기록 공유하기',
      });
    } catch (e) {
      console.warn('[share-card]', e);
      showAlert(
        '공유하지 못했어요',
        '앱을 최신 버전으로 다시 설치했는지 확인해주세요.'
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="공유 카드" />
      <ScrollView contentContainerClassName="items-center gap-4 px-5 pb-8 pt-4">
        {/* 이 View가 그대로 이미지가 된다 */}
        <View
          ref={cardRef}
          collapsable={false}
          style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            backgroundColor: CARD_BG,
            borderRadius: 24,
            overflow: 'hidden',
          }}
        >
          {photo ? (
            <Image
              source={photoUri ? { uri: photoUri } : undefined}
              style={{ width: CARD_WIDTH, height: 210 }}
              contentFit="cover"
              onLoad={() => setPhotoLoaded(true)}
            />
          ) : (
            <View
              style={{
                width: CARD_WIDTH,
                height: 150,
                backgroundColor: `${primary}22`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RNText style={{ fontSize: 64 }}>{category.emoji}</RNText>
            </View>
          )}

          <View style={{ flex: 1, padding: 20, gap: 8 }}>
            <CardText size={12} color={primary} weight="700">
              {`${KIND_META[item.kind].doneLabel} · ${dayjs(done.date).format('YYYY.M.D')}`}
            </CardText>
            <CardText size={22} color={CARD_TEXT} weight="800" lines={2}>
              {item.title}
            </CardText>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Icon
                  key={n}
                  as={Star}
                  size={16}
                  color={n <= done.rating ? primary : '#E5E8EB'}
                  fill={n <= done.rating ? primary : '#E5E8EB'}
                />
              ))}
            </View>
            {done.review ? (
              <CardText
                size={14}
                color={CARD_TEXT}
                weight="500"
                lines={photo ? 2 : 4}
              >
                {`“${done.review}”`}
              </CardText>
            ) : null}

            <View
              style={{
                marginTop: 'auto',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <CardText size={12} color={CARD_MUTED} weight="500" lines={1}>
                {space ? `${space.emoji} ${space.name}` : '나의 버킷리스트'}
              </CardText>
              <CardText size={12} color={CARD_MUTED} weight="700">
                DoIt2 · 두잇투
              </CardText>
            </View>
          </View>
        </View>

        <Text variant="muted" size={12} className="text-center">
          카드를 이미지로 만들어 카톡, 인스타 등에 공유해요
        </Text>
      </ScrollView>
      <BottomBar>
        <Button
          label={
            sharing ? '만드는 중…' : ready ? '공유하기' : '사진 불러오는 중…'
          }
          disabled={sharing || !ready}
          onPress={() => void share()}
        />
      </BottomBar>
    </SafeAreaView>
  );
}

/** 카드 안 글자: 다크 모드 색을 따르지 않게 색을 직접 준다 */
function CardText({
  children,
  size,
  color,
  weight,
  lines,
}: {
  children: string;
  size: number;
  color: string;
  weight: keyof typeof FONT_WEIGHTS;
  lines?: number;
}) {
  return (
    <RNText
      numberOfLines={lines}
      style={{
        fontFamily: FONT_WEIGHTS[weight],
        fontSize: size,
        lineHeight: Math.round(size * 1.4),
        color,
      }}
    >
      {children}
    </RNText>
  );
}
