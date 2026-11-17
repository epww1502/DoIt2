/**
 * 홈 화면 위젯 (안드로이드, 새 빌드부터). 이름은 app.json의 expo-widgets 설정과 같아야 한다.
 *
 * 아이폰 위젯(widgets/ios.tsx)과 다른 점:
 * - 안드로이드는 '며칠 치를 미리 넘겨 두는' 기능이 없다. 그래서 날짜마다의 값을 한꺼번에 넘기고(days),
 *   위젯이 그려질 때 오늘 날짜의 값을 스스로 고른다. 위젯은 30분마다 저절로 다시 그려지고
 *   (plugins/withWidgetAutoRefresh.js), '새로고침'을 눌러도 다시 그려진다.
 * - 위젯을 눌러 앱의 특정 화면을 여는 기능이 없다. 보여 주기와 위젯 안의 버튼만 된다.
 *
 * 위젯 그림을 그리는 함수('widget' 표시가 붙은 것)는 앱과 떨어진 곳에서 따로 돌아가서,
 * 함수 밖의 값(상수, 다른 함수)을 쓸 수 없다. 넘겨받은 값과 화면 부품만 쓴다.
 */
import { Button, Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  fillMaxSize,
  fillMaxWidth,
  paddingAll,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';

import type {
  DdayProps,
  MemoryProps,
  NextProps,
  PickProps,
} from '@/lib/widgets/data';

/** 날짜(YYYY-MM-DD)마다의 값. 위젯이 그려질 때 오늘 것을 고른다 */
export type ByDay<T> = { days: Record<string, T> };

type Env = { colorScheme?: 'light' | 'dark' };

/** 1년 전 오늘 */
function MemoryLayout(props: ByDay<MemoryProps>, env: Env) {
  'widget';
  const now = new Date();
  const two = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const today = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
  const dark = env.colorScheme === 'dark';
  const ink = dark ? '#F5F5F7' : '#2F2B28';
  const sub = dark ? '#AAAAAA' : '#8C6D53';
  const data = props.days ? props.days[today] : undefined;
  return (
    <Column
      modifiers={[
        fillMaxSize(),
        background(dark ? '#1F1D2B' : '#FFF8EF'),
        paddingAll(14),
      ]}
    >
      <Text color="#5AB0FF" style={{ fontSize: 13, fontWeight: '600' }}>
        {data && data.label ? data.label : '1년 전 오늘'}
      </Text>
      {data && data.label ? (
        <Column>
          <Text
            color={ink}
            maxLines={2}
            style={{ fontSize: 17, fontWeight: '700' }}
          >
            {data.title}
          </Text>
          <Text color="#F5A623" style={{ fontSize: 13 }}>
            {data.stars}
          </Text>
          {data.review ? (
            <Text color={sub} maxLines={2} style={{ fontSize: 13 }}>
              {data.review}
            </Text>
          ) : null}
        </Column>
      ) : (
        <Text color={ink} style={{ fontSize: 14, fontWeight: '600' }}>
          {data
            ? '기록이 쌓이면 지난해 오늘을 보여드려요'
            : '앱을 한 번 열면 오늘 날짜로 맞춰져요'}
        </Text>
      )}
      <Spacer modifiers={[weight(1)]} />
      <Row modifiers={[fillMaxWidth()]}>
        <Text color={sub} style={{ fontSize: 11 }}>
          {`${now.getMonth() + 1}월 ${now.getDate()}일 기준`}
        </Text>
        <Spacer modifiers={[weight(1)]} />
        <Button
          onClick={
            (() => ({ refreshedAt: Date.now() })) as unknown as () => void
          }
        >
          <Text style={{ fontSize: 12 }}>새로고침</Text>
        </Button>
      </Row>
    </Column>
  );
}

/** 다가오는 날 (D-day) */
function DdayLayout(props: ByDay<DdayProps>, env: Env) {
  'widget';
  const now = new Date();
  const two = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const today = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
  const dark = env.colorScheme === 'dark';
  const ink = dark ? '#F5F5F7' : '#2F2B28';
  const sub = dark ? '#AAAAAA' : '#8C6D53';
  const data = props.days ? props.days[today] : undefined;
  return (
    <Column
      modifiers={[
        fillMaxSize(),
        background(dark ? '#1F1D2B' : '#FFF8EF'),
        paddingAll(14),
      ]}
    >
      <Text color="#5AB0FF" style={{ fontSize: 13, fontWeight: '600' }}>
        다가오는 날
      </Text>
      {data && data.dday ? (
        <Column>
          <Text color={ink} style={{ fontSize: 30, fontWeight: '800' }}>
            {data.dday}
          </Text>
          <Text
            color={ink}
            maxLines={2}
            style={{ fontSize: 14, fontWeight: '600' }}
          >
            {data.title}
          </Text>
          <Text color={sub} style={{ fontSize: 12 }}>
            {data.date}
          </Text>
        </Column>
      ) : (
        <Text color={ink} style={{ fontSize: 14, fontWeight: '600' }}>
          {data
            ? '날짜를 정한 항목이 여기에 보여요'
            : '앱을 한 번 열면 오늘 날짜로 맞춰져요'}
        </Text>
      )}
      <Spacer modifiers={[weight(1)]} />
      <Row modifiers={[fillMaxWidth()]}>
        <Text color={sub} style={{ fontSize: 11 }}>
          {`${now.getMonth() + 1}월 ${now.getDate()}일 기준`}
        </Text>
        <Spacer modifiers={[weight(1)]} />
        <Button
          onClick={
            (() => ({ refreshedAt: Date.now() })) as unknown as () => void
          }
        >
          <Text style={{ fontSize: 12 }}>새로고침</Text>
        </Button>
      </Row>
    </Column>
  );
}

/** 다음에 할 것 */
function NextLayout(props: NextProps, env: Env) {
  'widget';
  const dark = env.colorScheme === 'dark';
  const ink = dark ? '#F5F5F7' : '#2F2B28';
  const sub = dark ? '#AAAAAA' : '#8C6D53';
  const items = props.items ?? [];
  return (
    <Column
      modifiers={[
        fillMaxSize(),
        background(dark ? '#1F1D2B' : '#FFF8EF'),
        paddingAll(14),
      ]}
    >
      <Text color="#5AB0FF" style={{ fontSize: 13, fontWeight: '600' }}>
        다음에 할 것
      </Text>
      {items.length === 0 ? (
        <Text color={ink} style={{ fontSize: 14, fontWeight: '600' }}>
          하고 싶은 걸 담으면 여기에 보여요
        </Text>
      ) : null}
      {items.map((item) => (
        <Text
          key={item.url}
          color={ink}
          maxLines={1}
          style={{ fontSize: 14, fontWeight: '500' }}
        >
          {`○  ${item.title}`}
        </Text>
      ))}
      {props.more > 0 ? (
        <Text color={sub} style={{ fontSize: 12 }}>
          {`외 ${props.more}개`}
        </Text>
      ) : null}
    </Column>
  );
}

/** 오늘 뭐 하지: '다시 뽑기'를 누르면 다음 후보로 넘어간다 */
function PickLayout(props: PickProps, env: Env) {
  'widget';
  const dark = env.colorScheme === 'dark';
  const ink = dark ? '#F5F5F7' : '#2F2B28';
  const picks = props.picks ?? [];
  const count = picks.length;
  const index = props.index ?? 0;
  return (
    <Column
      modifiers={[
        fillMaxSize(),
        background(dark ? '#1F1D2B' : '#FFF8EF'),
        paddingAll(14),
      ]}
    >
      <Text color="#5AB0FF" style={{ fontSize: 13, fontWeight: '600' }}>
        오늘 뭐 하지
      </Text>
      <Text
        color={ink}
        maxLines={2}
        style={{ fontSize: 17, fontWeight: '700' }}
      >
        {count === 0
          ? '담아 둔 게 있으면 여기서 뽑아드려요'
          : picks[index % count].title}
      </Text>
      <Spacer modifiers={[weight(1)]} />
      {count > 0 ? (
        <Button
          // 위젯 안에서 돌아가는 함수: 바뀐 값을 돌려주면 위젯이 그 값으로 다시 그려진다
          onClick={
            (() => ({ index: (index + 1) % count })) as unknown as () => void
          }
        >
          <Text style={{ fontSize: 13 }}>다시 뽑기</Text>
        </Button>
      ) : null}
    </Column>
  );
}

export const memoryWidget = createWidget<ByDay<MemoryProps>>(
  'DoItMemory',
  MemoryLayout,
  { days: {} }
);
export const ddayWidget = createWidget<ByDay<DdayProps>>(
  'DoItDday',
  DdayLayout,
  { days: {} }
);
export const nextWidget = createWidget<NextProps>('DoItNext', NextLayout, {
  items: [],
  more: 0,
});
export const pickWidget = createWidget<PickProps>('DoItPick', PickLayout, {
  picks: [],
  index: 0,
});
