import { router } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, NavBar, Text, TextField } from '@/components/atoms';
import { EmptyState } from '@/components/bucket/EmptyState';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import {
  ADMIN_PIN_LENGTH,
  type AdminStatus,
  fetchAdminStatus,
  lockAdmin,
  pinFailureMessage,
  setAdminPin,
  unlockAdmin,
} from '@/lib/admin';

export type AdminControls = {
  /** 바로 잠그고 나간다 */
  lock: () => void;
  /** PIN 바꾸기 화면을 연다 */
  changePin: () => void;
  /** 서버가 거절했을 때(15분이 지남) 다시 확인해서 PIN을 묻게 한다 */
  recheck: () => void;
};

const digits = (text: string) =>
  text.replace(/[^0-9]/g, '').slice(0, ADMIN_PIN_LENGTH);

function PinField({
  label,
  value,
  onChangeText,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <TextField
        value={value}
        onChangeText={(text) => onChangeText(digits(text))}
        placeholder={`숫자 ${ADMIN_PIN_LENGTH}자리`}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={ADMIN_PIN_LENGTH}
        autoFocus={autoFocus}
      />
    </View>
  );
}

/** PIN 넣기 / 처음 정하기 / 바꾸기 */
function PinForm({
  mode,
  onDone,
}: {
  mode: 'unlock' | 'set' | 'change';
  onDone: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = (pin: string) => pin.length === ADMIN_PIN_LENGTH;
  const ready =
    mode === 'unlock'
      ? full(current)
      : full(next) && full(again) && (mode === 'set' || full(current));

  const submit = async () => {
    if (mode !== 'unlock' && next !== again) {
      setError('새 PIN 두 개가 서로 달라요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === 'unlock'
          ? await unlockAdmin(current)
          : await setAdminPin(next, mode === 'change' ? current : undefined);
      if (result.ok) {
        onDone();
        return;
      }
      setError(pinFailureMessage(result));
      setCurrent('');
    } catch {
      setError('서버에 연결하지 못했어요. 다시 해주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-5">
      <Text size={13} className="text-muted-foreground">
        {mode === 'unlock'
          ? '관리자 PIN을 넣어주세요. 맞으면 15분 동안 열려요.'
          : mode === 'set'
            ? `관리자 모드를 열 때 쓸 PIN을 정해주세요 (숫자 ${ADMIN_PIN_LENGTH}자리). 다섯 번 틀리면 1시간 동안 잠겨요.`
            : '지금 PIN을 확인한 뒤 새 PIN으로 바꿔요.'}
      </Text>
      {mode !== 'set' ? (
        <PinField
          label={mode === 'unlock' ? 'PIN' : '지금 PIN'}
          value={current}
          onChangeText={setCurrent}
          autoFocus
        />
      ) : null}
      {mode !== 'unlock' ? (
        <>
          <PinField
            label="새 PIN"
            value={next}
            onChangeText={setNext}
            autoFocus={mode === 'set'}
          />
          <PinField
            label="새 PIN 한 번 더"
            value={again}
            onChangeText={setAgain}
          />
        </>
      ) : null}
      {error ? (
        <Text size={13} className="text-destructive">
          {error}
        </Text>
      ) : null}
      <Button
        label={
          busy
            ? '확인하는 중…'
            : mode === 'unlock'
              ? '열기'
              : mode === 'set'
                ? 'PIN 정하기'
                : 'PIN 바꾸기'
        }
        disabled={busy || !ready}
        onPress={() => void submit()}
      />
    </View>
  );
}

/**
 * 관리자 화면을 감싼다: 관리자 계정인지, PIN으로 열었는지를 서버에 물어보고, 아니면 PIN부터 묻는다.
 * 실제로 막는 것은 서버다 (PIN으로 열지 않으면 자료를 주지 않는다). 여기는 그 순서를 안내할 뿐이다.
 */
export function AdminGate({
  title,
  children,
}: {
  title: string;
  children: (controls: AdminControls) => ReactNode;
}) {
  const keyboardHeight = useKeyboardHeight();
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [changing, setChanging] = useState(false);

  const recheck = useCallback(() => {
    setStatus(null);
    void fetchAdminStatus().then(setStatus);
  }, []);
  useEffect(() => {
    let alive = true;
    void fetchAdminStatus().then((next) => {
      if (alive) setStatus(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (status?.admin && status.unlocked && !changing) {
    return (
      <>
        {children({
          lock: () => {
            void lockAdmin();
            router.back();
          },
          changePin: () => setChanging(true),
          recheck,
        })}
      </>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar
        title={changing ? 'PIN 바꾸기' : title}
        onBack={changing ? () => setChanging(false) : undefined}
      />
      {status === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : !status.admin ? (
        <EmptyState
          emoji="🔒"
          title="관리자만 볼 수 있어요"
          description="이 계정에는 관리자 권한이 없어요."
        />
      ) : (
        <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
          <ScrollView
            contentContainerClassName="px-5 pb-8 pt-4"
            keyboardShouldPersistTaps="handled"
          >
            <PinForm
              key={changing ? 'change' : status.pin_set ? 'unlock' : 'set'}
              mode={changing ? 'change' : status.pin_set ? 'unlock' : 'set'}
              onDone={() => {
                setChanging(false);
                recheck();
              }}
            />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
