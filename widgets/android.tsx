/**
 * 홈 화면 위젯 (안드로이드, 새 빌드부터). 이름은 app.json의 expo-widgets 설정과 같아야 한다.
 *
 * 아이폰 위젯(widgets/ios.tsx)과 다른 점:
 * - 안드로이드는 '며칠 치를 미리 넘겨 두는' 기능이 없다. 그래서 날짜마다의 값을 한꺼번에 넘기고(days),
 *   위젯이 그려질 때 오늘 날짜의 값을 스스로 고른다. 위젯은 30분마다 저절로 다시 그려지고
 *   (plugins/withWidgetAutoRefresh.js), '새로고침'을 눌러도 다시 그려진다.
 * - 눌러서 앱 화면 열기: target이 "open:<주소>"인 버튼은 그 주소로 앱을 연다
 *   (patches/expo-widgets 참고. project_month에서 쓰던 방식). 안드로이드 Button 타입에는 target이 없어서 펼쳐서 넘긴다.
 * - 위젯의 Column은 남는 자리를 벌리는 기능이 없어서, Box에 겹쳐 놓고 아래쪽 줄은 아래 정렬 Column에 둔다.
 *   버튼 글자는 Box로 감싸야 정한 글자 크기·모양으로 그려진다.
 *
 * 위젯 그림을 그리는 함수('widget' 표시가 붙은 것)는 앱과 떨어진 곳에서 따로 돌아가서,
 * 함수 밖의 값(상수, 다른 함수)을 쓸 수 없다. 넘겨받은 값과 화면 부품만 쓴다.
 */
import {
  Box,
  Button,
  Column,
  Row,
  Spacer,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  fillMaxWidth,
  height,
  paddingAll,
  size,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type {
  DdayProps,
  MemoryProps,
  NextProps,
  PickProps,
} from '@/lib/widgets/data';

/** 날짜(YYYY-MM-DD)마다의 값. 위젯이 그려질 때 오늘 것을 고른다 */
export type ByDay<T> = { days: Record<string, T> };

/** 1년 전 오늘 (누르면 그 기록으로) */
function MemoryLayout(props: ByDay<MemoryProps>, env: WidgetEnvironment) {
  'widget';
  const now = new Date();
  const two = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const today = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
  const dark = env.colorScheme === 'dark';
  const bg = dark ? '#1F1D2B' : '#FFF8EF';
  const ink = dark ? '#F5F5F7' : '#2F2B28';
  const sub = dark ? '#AAAAAA' : '#8C6D53';
  const chip = dark ? '#34324A' : '#F6E6D6';
  const data = props.days ? props.days[today] : undefined;
  const has = Boolean(data && data.label);
  return (
    <Box
      modifiers={[
        fillMaxSize(),
        background(bg),
        cornerRadius(24),
        paddingAll(14),
      ]}
    >
      <Button
        {...{ target: `open:${data ? data.url : 'doit2://'}` }}
        colors={{ containerColor: bg }}
        contentPadding={{ start: 0, top: 0, end: 0, bottom: 0 }}
        modifiers={[fillMaxWidth()]}
      >
        <Column modifiers={[fillMaxWidth()]}>
          <Text color="#5AB0FF" style={{ fontSize: 12, fontWeight: '600' }}>
            {has && data ? data.label : '1년 전 오늘'}
          </Text>
          <Box modifiers={[height(4)]} />
          <Text
            color={ink}
            maxLines={2}
            style={{ fontSize: has ? 17 : 13, fontWeight: '700' }}
          >
            {has && data
              ? data.title
              : data
                ? '기록이 쌓이면 지난해 오늘을 보여드려요'
                : '앱을 한 번 열면 오늘 날짜로 맞춰져요'}
          </Text>
          {has && data ? (
            <Text color="#F5A623" style={{ fontSize: 12 }}>
              {data.stars}
            </Text>
          ) : null}
          {has && data && data.review ? (
            <Text color={sub} maxLines={1} style={{ fontSize: 12 }}>
              {data.review}
            </Text>
          ) : null}
        </Column>
      </Button>
      <Column modifiers={[fillMaxSize()]} verticalArrangement="bottom">
        <Row verticalAlignment="center">
          <Button
            // 위젯 안에서 돌아가는 함수: 값을 돌려주면 위젯이 다시 그려지고, 그때 오늘 날짜를 다시 고른다
            onClick={
              (() => ({ refreshedAt: Date.now() })) as unknown as () => void
            }
            colors={{ containerColor: chip }}
            modifiers={[size(64, 26), cornerRadius(13)]}
          >
            <Box modifiers={[fillMaxSize()]} contentAlignment="center">
              <Text color={ink} style={{ fontSize: 11, fontWeight: '600' }}>
                새로고침
              </Text>
            </Box>
          </Button>
          <Spacer modifiers={[width(8)]} />
          <Text color={sub} style={{ fontSize: 10 }}>
            {`${now.getMonth() + 1}월 ${now.getDate()}일 기준`}
          </Text>
        </Row>
      </Column>
    </Box>
  );
}

/** 다가오는 날 (누르면 그 항목으로) */
function DdayLayout(props: ByDay<DdayProps>, env: WidgetEnvironment) {
  'widget';
  const now = new Date();
  const two = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const today = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
  const dark = env.colorScheme === 'dark';
  const bg = dark ? '#1F1D2B' : '#FFF8EF';
  const ink = dark ? '#F5F5F7' : '#2F2B28';
  const sub = dark ? '#AAAAAA' : '#8C6D53';
  const chip = dark ? '#34324A' : '#F6E6D6';
  const data = props.days ? props.days[today] : undefined;
  const has = Boolean(data && data.dday);
  return (
    <Box
      modifiers={[
        fillMaxSize(),
        background(bg),
        cornerRadius(24),
        paddingAll(14),
      ]}
    >
      <Button
        {...{ target: `open:${data ? data.url : 'doit2://'}` }}
        colors={{ containerColor: bg }}
        contentPadding={{ start: 0, top: 0, end: 0, bottom: 0 }}
        modifiers={[fillMaxWidth()]}
      >
        <Column modifiers={[fillMaxWidth()]}>
          <Text color="#5AB0FF" style={{ fontSize: 12, fontWeight: '600' }}>
            다가오는 날
          </Text>
          {has && data ? (
            <Text color={ink} style={{ fontSize: 28, fontWeight: '800' }}>
              {data.dday}
            </Text>
          ) : (
            <Box modifiers={[height(4)]} />
          )}
          <Text
            color={ink}
            maxLines={2}
            style={{ fontSize: 13, fontWeight: '600' }}
          >
            {has && data
              ? data.title
              : data
                ? '날짜를 정한 항목이 여기에 보여요'
                : '앱을 한 번 열면 오늘 날짜로 맞춰져요'}
          </Text>
          {has && data ? (
            <Text color={sub} style={{ fontSize: 11 }}>
              {data.date}
            </Text>
          ) : null}
        </Column>
      </Button>
      <Column modifiers={[fillMaxSize()]} verticalArrangement="bottom">
        <Row verticalAlignment="center">
          <Button
            onClick={
              (() => ({ refreshedAt: Date.now() })) as unknown as () => void
            }
            colors={{ containerColor: chip }}
            modifiers={[size(64, 26), cornerRadius(13)]}
          >
            <Box modifiers={[fillMaxSize()]} contentAlignment="center">
              <Text color={ink} style={{ fontSize: 11, fontWeight: '600' }}>
                새로고침
              </Text>
            </Box>
          </Button>
        </Row>
      </Column>
    </Box>
  );
}

/** 다음에 할 것 (줄을 누르면 그 항목으로) */
function NextLayout(props: NextProps, env: WidgetEnvironment) {
  'widget';
  const dark = env.colorScheme === 'dark';
  const bg = dark ? '#1F1D2B' : '#FFF8EF';
  const ink = dark ? '#F5F5F7' : '#2F2B28';
  const sub = dark ? '#AAAAAA' : '#8C6D53';
  const items = props.items ?? [];
  return (
    <Box
      modifiers={[
        fillMaxSize(),
        background(bg),
        cornerRadius(24),
        paddingAll(14),
      ]}
    >
      <Column modifiers={[fillMaxWidth()]}>
        <Text color="#5AB0FF" style={{ fontSize: 12, fontWeight: '600' }}>
          다음에 할 것
        </Text>
        <Box modifiers={[height(4)]} />
        {items.length === 0 ? (
          <Text color={ink} style={{ fontSize: 13, fontWeight: '600' }}>
            하고 싶은 걸 담으면 여기에 보여요
          </Text>
        ) : null}
        {items.map((item) => (
          <Button
            key={item.url}
            {...{ target: `open:${item.url}` }}
            colors={{ containerColor: bg }}
            contentPadding={{ start: 0, top: 3, end: 0, bottom: 3 }}
            modifiers={[fillMaxWidth()]}
          >
            <Row modifiers={[fillMaxWidth()]}>
              <Text color="#5AB0FF" style={{ fontSize: 13 }}>
                ○
              </Text>
              <Spacer modifiers={[width(6)]} />
              <Text
                color={ink}
                maxLines={1}
                style={{ fontSize: 13, fontWeight: '500' }}
              >
                {item.title}
              </Text>
            </Row>
          </Button>
        ))}
        {props.more > 0 ? (
          <Text color={sub} style={{ fontSize: 11 }}>
            {`외 ${props.more}개`}
          </Text>
        ) : null}
      </Column>
    </Box>
  );
}

/** 오늘 뭐 하지: 이름을 누르면 그 항목으로, '다시 뽑기'를 누르면 다음 후보로 */
function PickLayout(props: PickProps, env: WidgetEnvironment) {
  'widget';
  const dark = env.colorScheme === 'dark';
  const bg = dark ? '#1F1D2B' : '#FFF8EF';
  const ink = dark ? '#F5F5F7' : '#2F2B28';
  const picks = props.picks ?? [];
  const count = picks.length;
  const index = props.index ?? 0;
  const current = count > 0 ? picks[index % count] : undefined;
  return (
    <Box
      modifiers={[
        fillMaxSize(),
        background(bg),
        cornerRadius(24),
        paddingAll(14),
      ]}
    >
      <Button
        {...{ target: `open:${current ? current.url : 'doit2://'}` }}
        colors={{ containerColor: bg }}
        contentPadding={{ start: 0, top: 0, end: 0, bottom: 0 }}
        modifiers={[fillMaxWidth()]}
      >
        <Column modifiers={[fillMaxWidth()]}>
          <Text color="#5AB0FF" style={{ fontSize: 12, fontWeight: '600' }}>
            오늘 뭐 하지
          </Text>
          <Box modifiers={[height(4)]} />
          <Text
            color={ink}
            maxLines={2}
            style={{ fontSize: current ? 17 : 13, fontWeight: '700' }}
          >
            {current ? current.title : '담아 둔 게 있으면 여기서 뽑아드려요'}
          </Text>
        </Column>
      </Button>
      {count > 1 ? (
        <Column modifiers={[fillMaxSize()]} verticalArrangement="bottom">
          <Button
            // 위젯 안에서 돌아가는 함수: 바뀐 값을 돌려주면 위젯이 그 값으로 다시 그려진다
            onClick={
              (() => ({ index: (index + 1) % count })) as unknown as () => void
            }
            colors={{ containerColor: '#5AB0FF' }}
            modifiers={[size(76, 30), cornerRadius(15)]}
          >
            <Box modifiers={[fillMaxSize()]} contentAlignment="center">
              <Text color="#FFFFFF" style={{ fontSize: 12, fontWeight: '600' }}>
                다시 뽑기
              </Text>
            </Box>
          </Button>
        </Column>
      ) : null}
    </Box>
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
