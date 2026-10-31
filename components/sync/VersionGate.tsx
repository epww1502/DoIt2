import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, View } from 'react-native';

import { Text } from '@/components/atoms';
import {
  checkRequiredUpdate,
  openStore,
  type RequiredUpdate,
} from '@/lib/appVersion';

/** 앱을 다시 앞으로 가져왔을 때 너무 자주 묻지 않도록 */
const RECHECK_MS = 30 * 60 * 1000;

/**
 * 스플래시가 끝난 뒤 앱 버전을 확인하고, 최소 버전보다 낮으면
 * 앱 위를 덮는 업데이트 화면을 띄운다. 닫을 수 없고 스토어로만 갈 수 있다.
 */
export function VersionGate() {
  const [required, setRequired] = useState<RequiredUpdate | null>(null);
  const lastCheck = useRef(0);

  useEffect(() => {
    if (__DEV__) return;
    let cancelled = false;
    const run = async () => {
      lastCheck.current = Date.now();
      const next = await checkRequiredUpdate();
      if (!cancelled) setRequired(next);
    };
    void run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastCheck.current > RECHECK_MS) {
        void run();
      }
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  if (!required) return null;

  return (
    <Modal
      visible
      animationType="fade"
      // 뒤로가기로 닫히지 않게 한다
      onRequestClose={() => {}}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View className="flex-1 items-center justify-center gap-8 bg-background px-8">
        <Image
          source={require('@/assets/images/icon.png')}
          style={{ width: 96, height: 96, borderRadius: 24 }}
        />
        <View className="gap-3">
          <Text weight="700" size={22} className="text-center">
            업데이트가 필요해요
          </Text>
          <Text variant="muted" size={15} className="text-center">
            {required.message ??
              '앱이 새 버전으로 바뀌었어요.\n스토어에서 업데이트하면 계속 쓸 수 있어요.\n담아둔 버킷리스트와 기록은 그대로 남아요.'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void openStore(required.storeUrl)}
          className="h-14 w-full max-w-[340px] items-center justify-center rounded-2xl bg-primary active:opacity-70"
        >
          <Text weight="700" size={16} className="text-primary-foreground">
            스토어에서 업데이트
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
