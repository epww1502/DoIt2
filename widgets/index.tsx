/**
 * 홈 화면 위젯 (아이폰, 새 빌드부터). 이름은 app.json의 expo-widgets 설정과 같아야 한다.
 *
 * 위젯 그림을 그리는 함수('widget' 표시가 붙은 것)는 앱과 떨어진 곳에서 따로 돌아간다.
 * 그래서 함수 밖의 값(상수, 다른 함수)을 쓸 수 없고, 넘겨받은 값(props)과 화면 부품만 쓴다.
 * 보여줄 값은 lib/widgets/data.ts가 만들고 components/sync/WidgetSync.tsx가 넘긴다.
 */
import { Button, HStack, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  lineLimit,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

import type {
  DdayProps,
  MemoryProps,
  NextProps,
  PickProps,
} from '@/lib/widgets/data';

/** 1년 전 오늘: 그날의 추억 하나 (누르면 그 기록으로) */
function MemoryLayout(props: MemoryProps) {
  'widget';
  if (!props.label) {
    return (
      <VStack
        alignment="leading"
        spacing={6}
        modifiers={[widgetURL(props.url)]}
      >
        <Text
          modifiers={[
            font({ size: 13, weight: 'semibold' }),
            foregroundStyle('#5AB0FF'),
          ]}
        >
          DoIt2
        </Text>
        <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>
          기록이 쌓이면 지난해 오늘을 보여드려요
        </Text>
        <Spacer />
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={6} modifiers={[widgetURL(props.url)]}>
      <Text
        modifiers={[
          font({ size: 13, weight: 'semibold' }),
          foregroundStyle('#5AB0FF'),
        ]}
      >
        {props.label}
      </Text>
      <Text
        modifiers={[
          font({ size: 18, weight: 'bold', design: 'rounded' }),
          lineLimit(2),
        ]}
      >
        {props.title}
      </Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle('#F5A623')]}>
        {props.stars}
      </Text>
      {props.review ? (
        <Text
          modifiers={[
            font({ size: 13 }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
            lineLimit(2),
          ]}
        >
          {props.review}
        </Text>
      ) : null}
      <Spacer />
    </VStack>
  );
}

/** 다가오는 날: 가장 가까운 일정의 D-day (누르면 그 항목으로) */
function DdayLayout(props: DdayProps) {
  'widget';
  if (!props.dday) {
    return (
      <VStack
        alignment="leading"
        spacing={6}
        modifiers={[widgetURL(props.url)]}
      >
        <Text
          modifiers={[
            font({ size: 13, weight: 'semibold' }),
            foregroundStyle('#5AB0FF'),
          ]}
        >
          다가오는 날
        </Text>
        <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>
          날짜를 정한 항목이 여기에 보여요
        </Text>
        <Spacer />
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={4} modifiers={[widgetURL(props.url)]}>
      <Text
        modifiers={[
          font({ size: 13, weight: 'semibold' }),
          foregroundStyle('#5AB0FF'),
        ]}
      >
        다가오는 날
      </Text>
      <Text
        modifiers={[font({ size: 34, weight: 'heavy', design: 'rounded' })]}
      >
        {props.dday}
      </Text>
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(2)]}>
        {props.title}
      </Text>
      <Text
        modifiers={[
          font({ size: 12 }),
          foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
        ]}
      >
        {props.date}
      </Text>
      <Spacer />
    </VStack>
  );
}

/** 다음에 할 것: 아직 안 한 것 몇 줄 (줄을 누르면 그 항목으로) */
function NextLayout(props: NextProps) {
  'widget';
  return (
    <VStack alignment="leading" spacing={6}>
      <Text
        modifiers={[
          font({ size: 13, weight: 'semibold' }),
          foregroundStyle('#5AB0FF'),
        ]}
      >
        다음에 할 것
      </Text>
      {props.items.length === 0 ? (
        <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>
          하고 싶은 걸 담으면 여기에 보여요
        </Text>
      ) : null}
      {props.items.map((item) => (
        <Link key={item.url} destination={item.url}>
          <HStack spacing={6}>
            <Text modifiers={[font({ size: 14 }), foregroundStyle('#5AB0FF')]}>
              ○
            </Text>
            <Text
              modifiers={[
                font({ size: 14, weight: 'medium' }),
                foregroundStyle({ type: 'hierarchical', style: 'primary' }),
                lineLimit(1),
              ]}
            >
              {item.title}
            </Text>
            <Spacer />
          </HStack>
        </Link>
      ))}
      {props.more > 0 ? (
        <Text
          modifiers={[
            font({ size: 12 }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          {`외 ${props.more}개`}
        </Text>
      ) : null}
      <Spacer />
    </VStack>
  );
}

/**
 * 오늘 뭐 하지: 위젯 안에서 '다시 뽑기'를 누르면 다음 후보로 넘어간다.
 * 위젯 안의 버튼은 iOS 17부터 되어서, 그보다 낮은 버전에서는 위젯 목록에 나오지 않게 했다
 * (app.json에서 이 위젯에만 설정 항목을 둬서, 플러그인이 iOS 17 이상에서만 등록한다).
 */
function PickLayout(props: PickProps) {
  'widget';
  const count = props.picks.length;
  if (count === 0) {
    return (
      <VStack
        alignment="leading"
        spacing={6}
        modifiers={[widgetURL('doit2://')]}
      >
        <Text
          modifiers={[
            font({ size: 13, weight: 'semibold' }),
            foregroundStyle('#5AB0FF'),
          ]}
        >
          오늘 뭐 하지
        </Text>
        <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>
          담아 둔 게 있으면 여기서 뽑아드려요
        </Text>
        <Spacer />
      </VStack>
    );
  }
  const current = props.picks[props.index % count];
  return (
    <VStack alignment="leading" spacing={6}>
      <Text
        modifiers={[
          font({ size: 13, weight: 'semibold' }),
          foregroundStyle('#5AB0FF'),
        ]}
      >
        오늘 뭐 하지
      </Text>
      <Link destination={current.url}>
        <Text
          modifiers={[
            font({ size: 18, weight: 'bold', design: 'rounded' }),
            foregroundStyle({ type: 'hierarchical', style: 'primary' }),
            lineLimit(2),
          ]}
        >
          {current.title}
        </Text>
      </Link>
      <Spacer />
      <Button
        label="다시 뽑기"
        // 위젯 안에서 돌아가는 함수: 바뀐 값을 돌려주면 위젯이 그 값으로 다시 그려진다
        onPress={
          (() => ({
            picks: props.picks,
            index: (props.index + 1) % count,
          })) as unknown as () => void
        }
      />
    </VStack>
  );
}

export const memoryWidget = createWidget<MemoryProps>(
  'DoItMemory',
  MemoryLayout,
  { label: '', title: '', stars: '', review: '', url: 'doit2://' }
);
export const ddayWidget = createWidget<DdayProps>('DoItDday', DdayLayout, {
  dday: '',
  title: '',
  date: '',
  url: 'doit2://',
});
export const nextWidget = createWidget<NextProps>('DoItNext', NextLayout, {
  items: [],
  more: 0,
});
export const pickWidget = createWidget<PickProps, { includeDone: boolean }>(
  'DoItPick',
  PickLayout,
  { picks: [], index: 0 }
);
