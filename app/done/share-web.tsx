import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppSwitch, Button, NavBar, Text } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import {
  photoImageSource,
  usePhotoSource,
} from '@/components/bucket/DonePhoto';
import { EmptyState } from '@/components/bucket/EmptyState';
import { useLoad } from '@/hooks/useLoad';
import { useTogether } from '@/hooks/useTogether';
import { useYearRecap } from '@/hooks/useYearRecap';
import { albumPhotos, photoKey, type AlbumPhoto } from '@/lib/bucket/album';
import {
  buildMemoryPayload,
  MAX_SHARE_PHOTOS,
  MEMORY_SHARE_DAYS,
} from '@/lib/bucket/memoryShare';
import { showAlert } from '@/lib/dialog';
import { describeError } from '@/lib/errors';
import {
  createMemoryShare,
  deleteMemoryShare,
  listMemoryShares,
  type MemoryShare,
} from '@/lib/supabase/memoryShare';
import { useBucketStore } from '@/store/useBucketStore';
import { useSpace, useSpaceStore } from '@/store/useSpaceStore';

const COLUMNS = 3;
const GAP = 3;
const SIDE = 20;
/** 고를 수 있게 보여주는 사진 수 (최근 것부터) */
const MAX_CANDIDATES = 90;

/**
 * 웹 링크로 공유: 한 해 돌아보기를 누구나 열 수 있는 웹 페이지로 만든다.
 * 숫자·별점 높은 기록과 여기서 고른 사진만 올라가고, 링크는 30일 뒤 꺼진다 (그 전에도 아래에서 끌 수 있다).
 */
export default function ShareWebScreen() {
  const { year, recap } = useYearRecap();
  const together = useTogether();
  const spaceId = useBucketStore((s) => s.spaceId);
  const space = useSpace(spaceId);
  const signedIn = useSpaceStore((s) => s.userId !== null);
  const { width } = useWindowDimensions();

  const candidates = useMemo(
    () => (recap ? albumPhotos(recap.items).slice(0, MAX_CANDIDATES) : []),
    [recap]
  );
  /** 고른 사진 (고른 순서대로) */
  const [picked, setPicked] = useState<AlbumPhoto[]>([]);
  const [withReviews, setWithReviews] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const shares = useLoad(
    () => (signedIn ? listMemoryShares() : Promise.resolve([])),
    [signedIn]
  );

  if (!recap || !year || !signedIn) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title="웹 링크로 공유" />
        <EmptyState
          title={
            signedIn
              ? '올해 기록이 아직 없어요'
              : '지금은 링크를 만들 수 없어요'
          }
          description={
            signedIn
              ? '해낸 기록이 생기면 한 해를 웹 페이지로 나눌 수 있어요.'
              : '인터넷에 연결된 뒤 다시 열어주세요.'
          }
        />
      </SafeAreaView>
    );
  }

  const cell = Math.floor((width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const busy = progress !== null;

  const toggle = (photo: AlbumPhoto) => {
    if (busy) return;
    setPicked((list) => {
      if (list.includes(photo)) return list.filter((p) => p !== photo);
      if (list.length >= MAX_SHARE_PHOTOS) {
        showAlert(`사진은 ${MAX_SHARE_PHOTOS}장까지 고를 수 있어요`);
        return list;
      }
      return [...list, photo];
    });
  };

  const send = (share: MemoryShare) =>
    Share.share({ message: `${share.title} 돌아보기\n${share.link}` });

  const create = async () => {
    setProgress(0);
    try {
      const payload = buildMemoryPayload(recap, {
        space: space && !space.is_personal ? space.name : '',
        emoji: space?.emoji ?? '',
        together,
        withReviews,
        photoItems: picked.map((p) => p.item),
      });
      const share = await createMemoryShare(year, payload, picked, setProgress);
      setPicked([]);
      shares.reload();
      void send(share);
    } catch (e) {
      showAlert('링크를 만들지 못했어요', describeError(e).message);
    } finally {
      setProgress(null);
    }
  };

  const confirmCreate = () =>
    showAlert(
      '누구나 볼 수 있는 링크를 만들까요?',
      `링크를 아는 사람은 로그인 없이 볼 수 있어요.${
        picked.length > 0
          ? ` 고른 사진 ${picked.length}장도 함께 공개돼요.`
          : ''
      } ${MEMORY_SHARE_DAYS}일 뒤에 저절로 꺼지고, 그 전에도 이 화면에서 끌 수 있어요.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '만들기', onPress: () => void create() },
      ]
    );

  const close = (share: MemoryShare) =>
    showAlert(
      '이 링크를 끌까요?',
      '링크가 더는 열리지 않고, 올린 사진도 지워져요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '끄기',
          style: 'destructive',
          onPress: async () => {
            setClosing(share.id);
            try {
              await deleteMemoryShare(share.id);
              shares.reload();
            } catch (e) {
              showAlert('끄지 못했어요', describeError(e).message);
            } finally {
              setClosing(null);
            }
          },
        },
      ]
    );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="웹 링크로 공유" />
      <ScrollView contentContainerClassName="gap-6 pb-8 pt-2">
        <View className="mx-5 gap-2 rounded-2xl p-4 bg-accent">
          <Text weight="700" size={15}>
            {`${year}년 돌아보기를 웹 페이지로 만들어요`}
          </Text>
          <Text variant="muted" size={13}>
            {`링크를 아는 사람은 앱이 없어도 ${MEMORY_SHARE_DAYS}일 동안 볼 수 있어요. `}
            해낸 수, 평균 별점, 달마다 그래프, 별점 높은 기록 이름과 아래에서
            고른 사진만 올라가요.
          </Text>
          <Text variant="muted" size={13}>
            주소, 멤버 이름, 메모, 쓴 돈은 올라가지 않아요.
          </Text>
        </View>

        <View className="mx-5 flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-0.5">
            <Text weight="600" size={15}>
              내 한 줄 후기 보여주기
            </Text>
            <Text variant="muted" size={12}>
              별점 높은 기록에 내가 쓴 후기를 같이 보여줘요
            </Text>
          </View>
          <AppSwitch
            value={withReviews}
            onValueChange={setWithReviews}
            disabled={busy}
          />
        </View>

        <View className="gap-2">
          <View className="mx-5 flex-row items-baseline gap-1.5">
            <Text weight="700" size={15}>
              보여줄 사진
            </Text>
            <Text variant="muted" size={12}>
              {`${picked.length}/${MAX_SHARE_PHOTOS}장`}
            </Text>
          </View>
          {candidates.length === 0 ? (
            <Text variant="muted" size={13} className="mx-5">
              올해 기록에 올린 사진이 없어요. 사진 없이도 만들 수 있어요.
            </Text>
          ) : (
            <>
              <Text variant="muted" size={12} className="mx-5">
                고른 사진만 공개돼요. 고르지 않으면 사진 없이 만들어요.
              </Text>
              <View
                className="flex-row flex-wrap"
                style={{ gap: GAP, paddingHorizontal: SIDE }}
              >
                {candidates.map((photo, i) => (
                  <PickCell
                    key={`${photoKey(photo)}-${i}`}
                    photo={photo}
                    size={cell}
                    order={picked.indexOf(photo) + 1}
                    onPress={() => toggle(photo)}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        {shares.state.status === 'ready' && shares.state.data.length > 0 ? (
          <View className="mx-5 gap-2">
            <Text weight="700" size={15}>
              켜 둔 링크
            </Text>
            {shares.state.data.map((share) => (
              <View
                key={share.id}
                className="gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <View className="gap-0.5">
                  <Text weight="600" size={15} numberOfLines={1}>
                    {share.title}
                  </Text>
                  <Text variant="muted" size={12}>
                    {`${dayjs(share.expiresAt).format('M월 D일')}까지 열려요 · 사진 ${share.photoCount}장`}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Button
                    label="링크 보내기"
                    size="md"
                    variant="outline"
                    className="flex-1"
                    disabled={closing !== null}
                    onPress={() => void send(share)}
                  />
                  <Button
                    label={closing === share.id ? '끄는 중…' : '끄기'}
                    size="md"
                    variant="outline"
                    className="flex-1"
                    disabled={closing !== null}
                    onPress={() => close(share)}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <BottomBar>
        <Button
          label={
            busy
              ? picked.length > 0
                ? `사진 올리는 중… ${progress}/${picked.length}`
                : '만드는 중…'
              : '링크 만들기'
          }
          disabled={busy}
          onPress={confirmCreate}
        />
      </BottomBar>
    </SafeAreaView>
  );
}

/** 고를 사진 한 칸. 골랐으면 테두리와 고른 순서 번호 */
function PickCell({
  photo,
  size,
  order,
  onPress,
}: {
  photo: AlbumPhoto;
  size: number;
  /** 고른 순서 (1부터). 안 골랐으면 0 */
  order: number;
  onPress: () => void;
}) {
  const uri = usePhotoSource(photo.uri, photo.path);
  const selected = order > 0;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${photo.item.title} 사진`}
      onPress={onPress}
      className="overflow-hidden rounded-md bg-accent active:opacity-70"
      style={{ width: size, height: size }}
    >
      <Image
        source={photoImageSource(uri)}
        style={{ width: size, height: size, opacity: selected ? 0.75 : 1 }}
        contentFit="cover"
        transition={120}
      />
      {selected ? (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-end rounded-md border-[3px] border-primary p-1"
        >
          <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
            <Text size={12} weight="700" className="text-primary-foreground">
              {`${order}`}
            </Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}
