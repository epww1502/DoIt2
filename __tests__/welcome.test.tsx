import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

import WelcomeScreen from '@/app/welcome';
import { router } from 'expo-router';

const mockParams: { joined?: string } = {};
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/steps', () => ({ trackStep: jest.fn() }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
// 화면의 흐름만 본다. 꾸밈이 들어간 기본 부품은 글자와 누르기만 남긴다
jest.mock('@/components/atoms', () => {
  const mockReact = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  const el = mockReact.createElement;
  return {
    Text,
    Button: (props: { label: string; onPress?: () => void }) =>
      el(Pressable, props, el(Text, null, props.label)),
    Chip: (props: { label: string; onPress?: () => void }) =>
      el(Pressable, props, el(Text, null, props.label)),
    TextField: (props: { placeholder?: string }) =>
      el(jest.requireActual('react-native').TextInput, props),
  };
});
jest.mock('@/lib/haptics', () => ({
  hapticSelect: jest.fn(),
  hapticSuccess: jest.fn(),
}));
const mockCreateSpace = jest.fn<Promise<unknown>, unknown[]>();
const mockSwitchSpace = jest.fn<Promise<void>, unknown[]>(async () => {});
const mockAddItems = jest.fn<void, unknown[]>();
type MockSpace = {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
};
const mockSpaceState: { spaces: MockSpace[]; spaceId: string | null } = {
  spaces: [],
  spaceId: null,
};
jest.mock('@/store/useSpaceStore', () => {
  const state = {
    get spaces() {
      return mockSpaceState.spaces;
    },
    createSpace: (...a: unknown[]) => mockCreateSpace(...a),
  };
  const useSpaceStore = (sel: (s: typeof state) => unknown) => sel(state);
  useSpaceStore.getState = () => state;
  const useSpace = (id: string | null) =>
    mockSpaceState.spaces.find((sp) => sp.id === id) ?? null;
  return { useSpaceStore, useSpace };
});
jest.mock('@/store/useBucketStore', () => {
  const state = {
    get spaceId() {
      return mockSpaceState.spaceId;
    },
    switchSpace: (...a: unknown[]) => mockSwitchSpace(...a),
    addItems: (...a: unknown[]) => mockAddItems(...a),
  };
  const useBucketStore = (sel: (s: typeof state) => unknown) => sel(state);
  useBucketStore.getState = () => state;
  return { useBucketStore };
});
const mockSetWelcomed = jest.fn();
const mockSetSpaceTipPending = jest.fn();
jest.mock('@/store/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      setWelcomed: mockSetWelcomed,
      setSpaceTipPending: mockSetSpaceTipPending,
      setGuided: jest.fn(),
    }),
  },
}));
jest.mock('@/components/space/SpaceAvatar', () => ({
  SpaceAvatar: () => null,
}));
jest.mock('@/hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));
jest.mock('@/components/bucket/BottomBar', () => {
  const { View } = jest.requireActual('react-native');
  return { BottomBar: View };
});

const texts = (r: TestRenderer.ReactTestRenderer) => JSON.stringify(r.toJSON());
const press = async (r: TestRenderer.ReactTestRenderer, label: string) => {
  const node = r.root.findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      (n.props.accessibilityLabel === label || n.props.label === label)
  )[0];
  if (!node) throw new Error(`no pressable: ${label}`);
  await act(async () => {
    await node.props.onPress();
  });
};

it('연인과 → 고르기 → 공간 만들고 담기 → 초대 → 시작', async () => {
  mockCreateSpace.mockResolvedValue({
    id: 's1',
    name: '우리 둘',
    emoji: '🧑‍🤝‍🧑',
    invite_code: 'AB12CD',
    is_personal: false,
  });
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<WelcomeScreen />);
  });
  expect(texts(r)).toContain('누구와 같이 쓸까요?');
  await press(r, '연인과');
  expect(texts(r)).toContain('해보고 싶은 걸 골라보세요');
  await press(r, '바다 보러 가기');
  await press(r, '같이 요리하기');
  await press(r, '2개 담고 시작하기');
  expect(mockCreateSpace).toHaveBeenCalledWith('우리 둘', '🧑‍🤝‍🧑', false);
  expect(mockSwitchSpace).toHaveBeenCalledWith('s1');
  expect(
    (mockAddItems.mock.calls[0][0] as { title: string }[]).map((i) => i.title)
  ).toEqual(['바다 보러 가기', '같이 요리하기']);
  expect(texts(r)).toContain('버킷리스트가 생겼어요');
  await press(r, '나중에 할게요');
  expect(mockSetWelcomed).toHaveBeenCalledWith(true);
  expect(router.replace).toHaveBeenCalledWith('/');
  // 첫 화면에서 공간을 어디서 더 만드는지 알려 주게 해 둔다
  expect(mockSetSpaceTipPending).toHaveBeenCalledWith(true);
});

it('혼자 → 아무것도 안 고르고 시작하면 공간을 만들지 않는다', async () => {
  jest.clearAllMocks();
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<WelcomeScreen />);
  });
  await press(r, '혼자');
  await press(r, '나중에 담을게요');
  expect(mockCreateSpace).not.toHaveBeenCalled();
  expect(mockAddItems).not.toHaveBeenCalled();
  expect(mockSetWelcomed).toHaveBeenCalledWith(true);
});

it('함께 쓰려는데 서버에 연결하지 못하면 이 폰에 담고 알려준다', async () => {
  jest.clearAllMocks();
  mockCreateSpace.mockRejectedValue(new Error('offline'));
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<WelcomeScreen />);
  });
  await press(r, '가족과');
  await press(r, '캠핑 가기');
  await press(r, '1개 담고 시작하기');
  expect(mockAddItems).toHaveBeenCalled();
  expect(texts(r)).toContain('이 휴대폰에 먼저 담았어요');
  await press(r, '시작하기');
  expect(mockSetWelcomed).toHaveBeenCalledWith(true);
});

it('직접 해보기: 한 칸을 채우면 다음 칸이 나타나고, 만든 것이 예시와 같이 담긴다', async () => {
  jest.clearAllMocks();
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<WelcomeScreen />);
  });
  await press(r, '혼자');
  await press(r, '등산 가기');
  await press(r, '직접 해보기');
  expect(texts(r)).toContain('하나 같이 담아볼까요?');
  // 처음에는 첫 칸만 보인다
  expect(texts(r)).not.toContain('카테고리');
  await press(r, '탐방 · 가고 싶은 곳');
  const field = (placeholder: string) =>
    r.root.findAll((n) => n.props.placeholder === placeholder)[0];
  await act(async () =>
    field('예) 성수동 그 파스타집').props.onChangeText('제주도 한 달 살기')
  );
  expect(texts(r)).not.toContain('카테고리');
  await press(r, '다음');
  expect(texts(r)).toContain('카테고리');
  expect(texts(r)).not.toContain('실내에서 해요');
  await press(r, '여행');
  await press(r, '실외');
  await act(async () =>
    field('예) 예약하기, 준비물 챙기기').props.onChangeText('숙소 알아보기')
  );
  await press(r, '추가');
  await act(async () =>
    field('예) 예약하기, 준비물 챙기기').props.onChangeText('항공권 예매')
  );
  await press(r, '이대로 담기');
  // 고르는 화면으로 돌아오고, 만든 것이 고른 상태로 들어 있다
  expect(texts(r)).toContain('해보고 싶은 걸 골라보세요');
  await press(r, '2개 담고 시작하기');
  const added = mockAddItems.mock.calls[0][0] as {
    title: string;
    kind: string;
    category: string;
    setting: string;
    todos?: { text: string; done: boolean }[];
  }[];
  expect(added.map((i) => i.title)).toEqual(['등산 가기', '제주도 한 달 살기']);
  expect(added[1]).toMatchObject({
    kind: 'place',
    category: 'trip',
    setting: 'outdoor',
  });
  expect(added[1].todos?.map((t) => t.text)).toEqual([
    '숙소 알아보기',
    '항공권 예매',
  ]);
  expect(added[0].todos).toBeUndefined();
});

it('직접 해보기에서 돌아오면 고르던 것이 그대로 있다', async () => {
  jest.clearAllMocks();
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<WelcomeScreen />);
  });
  await press(r, '친구와');
  await press(r, '캠핑 가기');
  await press(r, '직접 해보기');
  await press(r, '예시에서 고를게요');
  expect(texts(r)).toContain('1개 담고 시작하기');
});

describe('초대받아 들어온 사람', () => {
  afterEach(() => {
    mockSpaceState.spaces = [];
    mockSpaceState.spaceId = null;
    delete mockParams.joined;
  });

  it('초대 링크로 처음 켰으면 들어온 곳을 알려주고, 고른 것을 그 공간에 담는다', async () => {
    jest.clearAllMocks();
    mockSpaceState.spaces = [
      { id: 's9', name: '우리 가족', emoji: '👨‍👩‍👧', memberCount: 3 },
    ];
    mockSpaceState.spaceId = 's9';
    mockParams.joined = '1';
    let r!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(<WelcomeScreen />);
    });
    expect(texts(r)).toContain("'우리 가족'에 들어왔어요");
    expect(texts(r)).toContain('지금 3명이 같이 쓰고 있어요');
    // 누구와 쓸지는 묻지 않는다
    expect(texts(r)).not.toContain('누구와 같이 쓸까요?');
    await press(r, '나도 하나 담아볼게요');
    await press(r, '캠핑 가기');
    await press(r, '1개 담고 시작하기');
    // 공간을 새로 만들지 않고, 초대 단계도 없다
    expect(mockCreateSpace).not.toHaveBeenCalled();
    expect(mockAddItems).toHaveBeenCalled();
    expect(mockSetWelcomed).toHaveBeenCalledWith(true);
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('둘러보기만 해도 된다', async () => {
    jest.clearAllMocks();
    mockSpaceState.spaces = [
      { id: 's9', name: '우리 가족', emoji: '👨‍👩‍👧', memberCount: 1 },
    ];
    mockSpaceState.spaceId = 's9';
    mockParams.joined = '1';
    let r!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(<WelcomeScreen />);
    });
    expect(texts(r)).not.toContain('명이 같이 쓰고 있어요');
    await press(r, '먼저 둘러볼게요');
    expect(mockAddItems).not.toHaveBeenCalled();
    expect(mockSetWelcomed).toHaveBeenCalledWith(true);
  });
});
