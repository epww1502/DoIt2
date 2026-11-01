import dayjs from 'dayjs';
import { Star } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Text as RNText,
  useWindowDimensions,
  View,
  type ViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, NavBar, Text } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { CategoryIcon } from '@/components/bucket/CategoryIcon';
import { PhotoImage } from '@/components/bucket/DonePhoto';
import { EmptyState } from '@/components/bucket/EmptyState';
import { SyncEmpty, useListSync } from '@/components/bucket/SyncNotice';
import { FONT_WEIGHTS } from '@/constants/fonts';
import { useReviewCtx } from '@/hooks/useReviewCtx';
import { useTogether } from '@/hooks/useTogether';
import { itemStatus, viewForMe } from '@/lib/bucket/reviews';
import { KIND_META, recordPhotos, type BucketItem } from '@/lib/bucket/types';
import {
  buildYearRecap,
  recapYear,
  type YearRecap,
} from '@/lib/bucket/yearRecap';
import { showAlert } from '@/lib/dialog';
import { useBucketStore } from '@/store/useBucketStore';
import { usePrimaryColor } from '@/store/useSettingsStore';
import { useSpace } from '@/store/useSpaceStore';

/** 카드는 다크 모드와 상관없이 늘 같은 색으로 (저장한 이미지가 같게) */
const WHITE = '#FFFFFF';
const INK = '#191F28';
const MUTED = '#8B95A1';
const LINE = '#EEF0F3';

type CardKey = 'intro' | 'firstLast' | 'best' | 'most' | 'photos' | 'summary';

/**
 * 올해의 우리: 한 해 동안 해낸 것을 카드 몇 장으로 넘겨 본다.
 * 지금 보고 있는 카드를 이미지로 저장하거나 공유할 수 있다.
 */
export default function YearRecapScreen() {
  const together = useTogether();
  const items = useBucketStore((s) => s.items);
  const spaceId = useBucketStore((s) => s.spaceId);
  const space = useSpace(spaceId);
  const sync = useListSync();
  const reviewCtx = useReviewCtx();
  const primary = usePrimaryColor();
  const { width, height } = useWindowDimensions();

  const done = useMemo(
    () =>
      items
        .filter((it) => itemStatus(it, reviewCtx) === 'done')
        .map((it) => viewForMe(it, reviewCtx)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, reviewCtx.userId, reviewCtx.inSpace]
  );
  const year = recapYear(done, new Date());
  const recap = useMemo(
    () => (year ? buildYearRecap(done, year) : null),
    [done, year]
  );

  const cards = useMemo<CardKey[]>(() => {
    if (!recap) return [];
    const list: CardKey[] = ['intro'];
    if (recap.total >= 2) list.push('firstLast');
    if (recap.best) list.push('best');
    list.push('most');
    if (recap.photos.length > 0) list.push('photos');
    list.push('summary');
    return list;
  }, [recap]);

  const [page, setPage] = useState(0);
  const cardRefs = useRef<(ViewInstance | null)[]>([]);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);

  // 카드 크기: 화면 폭에 맞추고, 너무 길면 높이에 맞춘다
  const cardWidth = Math.min(width - 40, (height - 260) / 1.4);
  const cardHeight = Math.round(cardWidth * 1.4);

  if (!recap || !year) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title="올해의 우리" />
        {sync.kind !== 'ok' ? (
          <SyncEmpty sync={sync} />
        ) : (
          <EmptyState
            title="올해 기록이 아직 없어요"
            description={`${together ? '함께 ' : ''}해낸 기록이 생기면 한 해를 돌아볼 수 있어요.`}
          />
        )}
      </SafeAreaView>
    );
  }

  const owner = space?.is_personal
    ? '나의'
    : space
      ? `${space.name}의`
      : '나의';

  /** 지금 카드를 PNG로 (네이티브 부품이 없는 예전 앱에서 멈추지 않게 쓸 때만 불러온다) */
  const capture = async () => {
    const { captureRef } = await import('react-native-view-shot');
    return captureRef(cardRefs.current[page]!, {
      format: 'png',
      quality: 1,
      width: Math.round(cardWidth * 3),
      height: Math.round(cardHeight * 3),
    });
  };

  const share = async () => {
    if (!cardRefs.current[page]) return;
    setBusy('share');
    try {
      const [uri, Sharing] = await Promise.all([
        capture(),
        import('expo-sharing'),
      ]);
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `${year}년 돌아보기 공유하기`,
      });
    } catch (e) {
      console.warn('[year-recap]', e);
      showAlert('공유하지 못했어요', '잠시 뒤에 다시 해보세요.');
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!cardRefs.current[page]) return;
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
      await MediaLibrary.Asset.create(await capture());
      showAlert('사진 앨범에 저장했어요');
    } catch (e) {
      console.warn('[year-recap] save', e);
      showAlert('저장하지 못했어요', '잠시 뒤에 다시 해보세요.');
    } finally {
      setBusy(null);
    }
  };

  const props: CardProps = { recap, primary, together, owner };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title={`${year}년 돌아보기`} />
      <View className="flex-1 justify-center">
        <FlatList
          data={cards}
          keyExtractor={(key) => key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setPage(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item: key, index }) => (
            <View style={{ width }} className="items-center justify-center">
              <View
                ref={(ref) => {
                  cardRefs.current[index] = ref;
                }}
                collapsable={false}
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  borderRadius: 28,
                  overflow: 'hidden',
                  backgroundColor:
                    key === 'intro' || key === 'summary' ? primary : WHITE,
                  borderWidth: key === 'intro' || key === 'summary' ? 0 : 1,
                  borderColor: LINE,
                }}
              >
                <RecapCard cardKey={key} {...props} />
              </View>
            </View>
          )}
        />
        {/* 몇 번째 카드인지 */}
        <View className="flex-row justify-center gap-1.5 pt-4">
          {cards.map((key, i) => (
            <View
              key={key}
              className={i === page ? 'bg-primary' : 'bg-muted'}
              style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3 }}
            />
          ))}
        </View>
        <Text variant="muted" size={12} className="pt-3 text-center">
          옆으로 넘겨 보고, 마음에 드는 카드를 저장하거나 공유해요
        </Text>
      </View>
      <BottomBar>
        <View className="flex-row gap-2">
          <Button
            label={busy === 'save' ? '저장하는 중…' : '앨범에 저장'}
            variant="outline"
            disabled={busy !== null}
            onPress={() => void save()}
            className="flex-1"
          />
          <Button
            label={busy === 'share' ? '만드는 중…' : '이 카드 공유하기'}
            disabled={busy !== null}
            onPress={() => void share()}
            className="flex-1"
          />
        </View>
      </BottomBar>
    </SafeAreaView>
  );
}

type CardProps = {
  recap: YearRecap;
  primary: string;
  together: boolean;
  /** '우리 둘 공간의' / '나의' */
  owner: string;
};

function RecapCard({ cardKey, ...props }: { cardKey: CardKey } & CardProps) {
  switch (cardKey) {
    case 'intro':
      return <IntroCard {...props} />;
    case 'firstLast':
      return <FirstLastCard {...props} />;
    case 'best':
      return <BestCard {...props} />;
    case 'most':
      return <MostCard {...props} />;
    case 'photos':
      return <PhotosCard {...props} />;
    default:
      return <SummaryCard {...props} />;
  }
}

function IntroCard({ recap, together, owner }: CardProps) {
  return (
    <View style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}>
      <CardText size={14} color={WHITE} weight="600">
        {`${owner} 한 해`}
      </CardText>
      <View style={{ gap: 6 }}>
        <CardText size={64} color={WHITE} weight="800">
          {`${recap.year}`}
        </CardText>
        <CardText size={26} color={WHITE} weight="800">
          {`${recap.total}개를\n${together ? '함께 ' : ''}해냈어요`}
        </CardText>
      </View>
      <View style={{ gap: 2 }}>
        <CardText size={14} color={WHITE} weight="500">
          {`${recap.days}번의 날을 기록했어요`}
        </CardText>
        <CardText size={12} color={WHITE} weight="500">
          옆으로 넘겨서 돌아봐요 →
        </CardText>
      </View>
    </View>
  );
}

function FirstLastCard({ recap, primary }: CardProps) {
  return (
    <View style={{ flex: 1, padding: 28, gap: 22, justifyContent: 'center' }}>
      <CardText size={14} color={primary} weight="700">
        시작과 지금
      </CardText>
      <Moment label="올해 처음 해낸 것" item={recap.first} primary={primary} />
      <View style={{ height: 1, backgroundColor: LINE }} />
      <Moment label="가장 최근에 해낸 것" item={recap.last} primary={primary} />
      <CardText size={13} color={MUTED} weight="500">
        {`그 사이 ${Math.max(0, recap.total - 2)}개를 더 해냈어요`}
      </CardText>
    </View>
  );
}

function Moment({
  label,
  item,
  primary,
}: {
  label: string;
  item: BucketItem;
  primary: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <CardText size={12} color={MUTED} weight="600">
        {label}
      </CardText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: `${primary}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CategoryIcon category={item.category} size={24} color={primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <CardText size={19} color={INK} weight="800" lines={2}>
            {item.title}
          </CardText>
          <CardText size={13} color={MUTED} weight="500">
            {dayjs(item.done!.date).format('M월 D일 (dd)')}
          </CardText>
        </View>
      </View>
    </View>
  );
}

function BestCard({ recap, primary }: CardProps) {
  const best = recap.best!;
  const photo = recordPhotos(best.done)[0];
  return (
    <View style={{ flex: 1 }}>
      {photo ? (
        <PhotoImage photo={photo} style={{ width: '100%', height: '48%' }} />
      ) : (
        <View
          style={{
            height: '38%',
            backgroundColor: `${primary}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CategoryIcon category={best.category} size={64} color={primary} />
        </View>
      )}
      <View style={{ flex: 1, padding: 24, gap: 8 }}>
        <CardText size={14} color={primary} weight="700">
          올해 최고의 순간
        </CardText>
        <CardText size={24} color={INK} weight="800" lines={2}>
          {best.title}
        </CardText>
        <Stars value={best.done!.rating} primary={primary} />
        {best.done!.review ? (
          <CardText size={15} color={INK} weight="500" lines={photo ? 2 : 5}>
            {`“${best.done!.review}”`}
          </CardText>
        ) : null}
        <View style={{ marginTop: 'auto' }}>
          <CardText size={12} color={MUTED} weight="500">
            {`${KIND_META[best.kind].doneLabel} · ${dayjs(best.done!.date).format('M월 D일')}`}
          </CardText>
        </View>
      </View>
    </View>
  );
}

function MostCard({ recap, primary, together }: CardProps) {
  return (
    <View style={{ flex: 1, padding: 28, gap: 22, justifyContent: 'center' }}>
      <CardText size={14} color={primary} weight="700">
        {together ? '올해 우리는' : '올해 나는'}
      </CardText>
      {recap.topArea ? (
        <Fact
          label="가장 많이 간 동네"
          value={recap.topArea.name}
          note={`${recap.topArea.count}번`}
          primary={primary}
        />
      ) : null}
      {recap.topCategory ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Fact
              label="가장 많이 한 것"
              value={recap.topCategory.label}
              note={`${recap.topCategory.count}개`}
              primary={primary}
            />
          </View>
          <CategoryIcon
            category={recap.topCategory.key}
            size={40}
            color={primary}
          />
        </View>
      ) : null}
      {recap.topMonth ? (
        <Fact
          label="가장 바빴던 달"
          value={`${recap.topMonth.month}월`}
          note={`${recap.topMonth.count}개`}
          primary={primary}
        />
      ) : null}
    </View>
  );
}

function Fact({
  label,
  value,
  note,
  primary,
}: {
  label: string;
  value: string;
  note: string;
  primary: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <CardText size={12} color={MUTED} weight="600">
        {label}
      </CardText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <CardText size={26} color={INK} weight="800" lines={1}>
          {value}
        </CardText>
        <CardText size={15} color={primary} weight="700">
          {note}
        </CardText>
      </View>
    </View>
  );
}

function PhotosCard({ recap, primary }: CardProps) {
  const photos = recap.photos;
  // 사진 수에 맞춰 2열 (1장이면 크게)
  const columns = photos.length === 1 ? 1 : 2;
  return (
    <View style={{ flex: 1, padding: 18, gap: 12 }}>
      <View style={{ paddingHorizontal: 6, paddingTop: 6, gap: 2 }}>
        <CardText size={14} color={primary} weight="700">
          올해의 사진
        </CardText>
        <CardText size={13} color={MUTED} weight="500">
          {`기록에 남긴 사진 중 ${photos.length}장`}
        </CardText>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {photos.map(({ item, photo }) => (
          <View
            key={item.id}
            style={{
              width: columns === 1 ? '100%' : '48.5%',
              height:
                columns === 1
                  ? '100%'
                  : photos.length <= 2
                    ? '100%'
                    : photos.length <= 4
                      ? '48.5%'
                      : '31.5%',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <PhotoImage
              photo={photo}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryCard({ recap, together, owner }: CardProps) {
  const tiles: [string, string][] = [
    ['해낸 것', `${recap.total}`],
    ['탐방한 곳', `${recap.places}`],
    ['성공한 도전', `${recap.activities}`],
    [
      '평균 별점',
      recap.averageRating > 0 ? recap.averageRating.toFixed(1) : '-',
    ],
  ];
  return (
    <View style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}>
      <View style={{ gap: 4 }}>
        <CardText size={14} color={WHITE} weight="600">
          {`${owner} ${recap.year}년`}
        </CardText>
        <CardText size={28} color={WHITE} weight="800">
          {together ? '함께라서\n즐거웠어요' : '한 해 동안\n잘 해냈어요'}
        </CardText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tiles.map(([label, value]) => (
          <View
            key={label}
            style={{
              width: '47%',
              borderRadius: 18,
              paddingVertical: 14,
              paddingHorizontal: 16,
              backgroundColor: 'rgba(255,255,255,0.18)',
              gap: 2,
            }}
          >
            <CardText size={26} color={WHITE} weight="800">
              {value}
            </CardText>
            <CardText size={12} color={WHITE} weight="500">
              {label}
            </CardText>
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <CardText size={12} color={WHITE} weight="500">
          {`${recap.days}번의 날을 기록했어요`}
        </CardText>
        <CardText size={12} color={WHITE} weight="700">
          DoIt2 · 두잇투
        </CardText>
      </View>
    </View>
  );
}

function Stars({ value, primary }: { value: number; primary: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          as={Star}
          size={18}
          color={n <= value ? primary : '#E5E8EB'}
          fill={n <= value ? primary : '#E5E8EB'}
        />
      ))}
    </View>
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
        lineHeight: Math.round(size * 1.3),
        color,
      }}
    >
      {children}
    </RNText>
  );
}
