import dayjs from 'dayjs';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, NavBar, Text } from '@/components/atoms';
import { AdminGate } from '@/components/admin/AdminGate';
import { EmptyState } from '@/components/bucket/EmptyState';
import { useLoad } from '@/hooks/useLoad';
import { copyText } from '@/lib/clipboard';
import { showAlert } from '@/lib/dialog';
import {
  fetchInquiries,
  type InquiryRow,
  setInquiryHandled,
} from '@/lib/inquiry';
import { cn } from '@/lib/utils';

/** 받은 문의 목록. 관리자가 PIN으로 연 동안만 서버가 전체를 준다 (그 밖에는 자기가 보낸 것만) */
export default function InquiriesScreen() {
  return (
    <AdminGate title="문의 목록">
      {(controls) => <InquiryList onRetry={controls.recheck} />}
    </AdminGate>
  );
}

function InquiryList({ onRetry }: { onRetry: () => void }) {
  const { state } = useLoad(fetchInquiries, []);
  // 답했는지 표시는 화면에 먼저 반영한다
  const [handled, setHandled] = useState<Record<string, boolean>>({});

  const toggle = async (row: InquiryRow) => {
    const next = !(handled[row.id] ?? Boolean(row.handled_at));
    setHandled((map) => ({ ...map, [row.id]: next }));
    try {
      await setInquiryHandled(row.id, next);
    } catch {
      setHandled((map) => ({ ...map, [row.id]: !next }));
      showAlert('바꾸지 못했어요', '잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="문의 목록" />
      {state.status === 'loading' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : state.status === 'error' ? (
        <ErrorState title="문의를 불러오지 못했어요" onRetry={onRetry} />
      ) : state.data.length === 0 ? (
        <EmptyState
          emoji="📭"
          title="아직 받은 문의가 없어요"
          description="도움말의 문의하기로 누가 보내면 여기에 모여요."
        />
      ) : (
        <ScrollView contentContainerClassName="gap-3 px-5 pb-10 pt-2">
          <Text size={12} className="text-muted-foreground">
            {`${state.data.length}건 · 연락처를 누르면 복사돼요`}
          </Text>
          {state.data.map((row) => {
            const done = handled[row.id] ?? Boolean(row.handled_at);
            return (
              <View
                key={row.id}
                className={cn(
                  'gap-2 rounded-2xl px-4 py-3 bg-accent',
                  done && 'opacity-60'
                )}
              >
                <Text size={12} className="text-muted-foreground">
                  {`${dayjs(row.created_at).format('M월 D일 HH:mm')} · ${row.platform ?? '?'} ${row.app_version ?? ''}`}
                </Text>
                <Text size={15} className="leading-6" selectable>
                  {row.message}
                </Text>
                <View className="flex-row items-center justify-between gap-3 pt-1">
                  {row.contact ? (
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={6}
                      onPress={() =>
                        void copyText(row.contact!, '연락처를 복사했어요')
                      }
                      className="shrink active:opacity-60"
                    >
                      <Text
                        weight="600"
                        size={13}
                        numberOfLines={1}
                        className="text-primary"
                      >
                        {row.contact}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text size={13} className="text-muted-foreground">
                      연락처 없음
                    </Text>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: done }}
                    hitSlop={6}
                    onPress={() => void toggle(row)}
                    className="h-8 items-center justify-center rounded-full bg-background px-3 active:opacity-70"
                  >
                    <Text
                      weight="600"
                      size={13}
                      className={
                        done ? 'text-muted-foreground' : 'text-primary'
                      }
                    >
                      {done ? '확인함 ✓' : '확인함으로 표시'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
