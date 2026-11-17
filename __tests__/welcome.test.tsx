import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

import WelcomeScreen from '@/app/welcome';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));
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
  };
});
jest.mock('@/lib/haptics', () => ({
  hapticSelect: jest.fn(),
  hapticSuccess: jest.fn(),
}));
const mockCreateSpace = jest.fn<Promise<unknown>, unknown[]>();
const mockSwitchSpace = jest.fn<Promise<void>, unknown[]>(async () => {});
const mockAddItems = jest.fn<void, unknown[]>();
jest.mock('@/store/useSpaceStore', () => {
  const state = {
    spaces: [],
    createSpace: (...a: unknown[]) => mockCreateSpace(...a),
  };
  const useSpaceStore = (sel: (s: typeof state) => unknown) => sel(state);
  useSpaceStore.getState = () => state;
  return { useSpaceStore };
});
jest.mock('@/store/useBucketStore', () => {
  const state = {
    switchSpace: (...a: unknown[]) => mockSwitchSpace(...a),
    addItems: (...a: unknown[]) => mockAddItems(...a),
  };
  return { useBucketStore: { getState: () => state } };
});
const mockSetWelcomed = jest.fn();
jest.mock('@/store/useSettingsStore', () => ({
  useSettingsStore: { getState: () => ({ setWelcomed: mockSetWelcomed }) },
}));
jest.mock('@/components/space/SpaceAvatar', () => ({
  SpaceAvatar: () => null,
}));
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
