import { Modal, Pressable, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/atoms';

export type TargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SpaceCoachMarkProps = {
  /** 비춰 줄 곳 (화면 기준 위치). 공간 바꾸기 버튼 */
  target: TargetRect;
  /** 함께 쓰는 중인지 (알려 주는 말이 달라진다) */
  together: boolean;
  onClose: () => void;
};

/** 비추는 칸을 버튼보다 조금 넉넉하게 */
const PAD = 6;
const DIM = 'rgba(0,0,0,0.6)';

/**
 * 시작 화면을 마친 뒤 한 번, 공간 바꾸기 버튼만 밝게 남기고 "여기서 추가할 수 있어요"를 알려 준다.
 * 버튼 둘레를 어두운 네 칸으로 덮어서 버튼 자리만 뚫려 보이게 한다. 어디를 눌러도 닫힌다.
 */
export function SpaceCoachMark({
  target,
  together,
  onClose,
}: SpaceCoachMarkProps) {
  const { width, height } = useWindowDimensions();
  const left = Math.max(target.x - PAD, 0);
  const top = Math.max(target.y - PAD, 0);
  const right = Math.min(target.x + target.width + PAD, width);
  const bottom = Math.min(target.y + target.height + PAD, height);

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="안내 닫기"
        onPress={onClose}
        className="flex-1"
      >
        {/* 위 · 왼쪽 · 오른쪽 · 아래 */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: top,
            backgroundColor: DIM,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            top,
            width: left,
            height: bottom - top,
            backgroundColor: DIM,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: right,
            right: 0,
            top,
            height: bottom - top,
            backgroundColor: DIM,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: bottom,
            bottom: 0,
            backgroundColor: DIM,
          }}
        />
        {/* 뚫린 자리의 테두리 */}
        <View
          pointerEvents="none"
          className="rounded-full border-2 border-primary"
          style={{
            position: 'absolute',
            left,
            top,
            width: right - left,
            height: bottom - top,
          }}
        />
        {/* 말풍선: 버튼 바로 아래, 오른쪽에 맞춘다 */}
        <View
          pointerEvents="none"
          className="gap-2 rounded-2xl bg-card p-4"
          style={{
            position: 'absolute',
            top: bottom + 12,
            right: 16,
            maxWidth: 300,
          }}
        >
          <Text weight="700" size={16}>
            {together
              ? '다른 사람들과도 쓰고 싶다면'
              : '누군가와 같이 쓰고 싶어지면'}
          </Text>
          <Text size={14} className="text-muted-foreground">
            {together
              ? '여기를 눌러 친구, 가족과 쓸 버킷리스트를 따로 더 만들 수 있어요. 여러 개를 오가며 볼 수 있어요.'
              : '여기를 눌러 함께 쓰는 버킷리스트를 만들고 초대할 수 있어요.'}
          </Text>
          <Text weight="600" size={14} className="text-right text-primary">
            알겠어요
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}
