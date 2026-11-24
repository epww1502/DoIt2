import { router } from 'expo-router';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import {
  biometricLabel,
  biometricOfferDeclined,
  biometricUnlockEnabled,
  declineBiometricOffer,
  disableBiometricUnlock,
  enableBiometricUnlock,
  readSavedPin,
} from '@/lib/adminBiometric';
import { showAlert } from '@/lib/dialog';

export type AdminControls = {
  /** 바로 잠그고 나간다 */
  lock: () => void;
  /** PIN 바꾸기 화면을 연다 */
  changePin: () => void;
  /** 서버가 거절했을 때(15분이 지남) 다시 확인해서 PIN을 묻게 한다 */
  recheck: () => void;
  /** 이 폰에서 생체 인증을 쓸 수 있을 때만: Face ID·지문으로 열기 켜고 끄기 */
  biometric: {
    label: string;
    enabled: boolean;
    toggle: () => void;
  } | null;
};

type PinMode = 'unlock' | 'set' | 'change';

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
  biometric,
}: {
  mode: PinMode;
  /** 서버가 맞다고 한 PIN (생체 인증으로 열었으면 null: 다시 저장할 필요가 없다) */
  onDone: (pin: string | null) => void;
  /** 생체 인증으로 열기를 켜 두었으면 그 이름 ('Face ID' 등) */
  biometric?: string | null;
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
        onDone(mode === 'unlock' ? current : next);
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

  // 생체 인증으로 저장해 둔 PIN을 꺼내 서버에 보낸다. 틀리면(다른 폰에서 PIN을 바꿈) 끄고 PIN을 묻는다
  const tryBiometric = useCallback(async () => {
    if (!biometric) return;
    setError(null);
    const saved = await readSavedPin();
    if ('cancelled' in saved) return;
    if ('lost' in saved) {
      setError(
        `${biometric} 정보가 바뀌어서 ${biometric}로 열기가 꺼졌어요. PIN을 넣어주세요.`
      );
      return;
    }
    setBusy(true);
    try {
      const result = await unlockAdmin(saved.pin);
      if (result.ok) {
        onDone(null);
        return;
      }
      if (result.reason === 'wrong') {
        await disableBiometricUnlock();
        setError(
          `저장해 둔 PIN이 맞지 않아서 ${biometric}로 열기를 껐어요. PIN을 넣어주세요.`
        );
      } else {
        setError(pinFailureMessage(result));
      }
    } catch {
      setError('서버에 연결하지 못했어요. 다시 해주세요.');
    } finally {
      setBusy(false);
    }
  }, [biometric, onDone]);

  // 화면을 열면 한 번 바로 묻는다
  const asked = useRef(false);
  useEffect(() => {
    if (mode !== 'unlock' || !biometric || asked.current) return;
    asked.current = true;
    void tryBiometric();
  }, [mode, biometric, tryBiometric]);

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
      {mode === 'unlock' && biometric ? (
        <Button
          label={`${biometric}로 열기`}
          variant="outline"
          disabled={busy}
          onPress={() => void tryBiometric()}
        />
      ) : null}
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
  /** 이 폰의 생체 인증 이름 (못 쓰면 null) */
  const [bioLabel, setBioLabel] = useState<string | null>(null);
  const [bioEnabled, setBioEnabled] = useState(false);
  /** 관리자 화면에서 '켜기'를 눌러 잠갔음: 다음에 PIN이 맞으면 바로 켠다 */
  const [enableAfterPin, setEnableAfterPin] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.all([biometricLabel(), biometricUnlockEnabled()]).then(
      ([label, enabled]) => {
        if (!alive) return;
        setBioLabel(label);
        setBioEnabled(label !== null && enabled);
      }
    );
    return () => {
      alive = false;
    };
  }, []);

  const enable = useCallback(async (pin: string) => {
    const saved = await enableBiometricUnlock(pin);
    setBioEnabled(saved);
    return saved;
  }, []);

  /** PIN이 맞았을 때: 생체 인증으로 열기를 켜거나(물어보고), 바꾼 PIN으로 다시 저장한다 */
  const afterPin = useCallback(
    async (pin: string, mode: PinMode) => {
      if (!bioLabel) return;
      if (mode === 'change') {
        if (bioEnabled) await enable(pin);
        return;
      }
      if (enableAfterPin) {
        setEnableAfterPin(false);
        await enable(pin);
        return;
      }
      if (bioEnabled || (await biometricOfferDeclined())) return;
      showAlert(
        `다음부터 ${bioLabel}로 열까요?`,
        `PIN을 이 폰에 ${bioLabel}를 걸어 저장해 두고, 열 때 ${bioLabel}가 맞으면 그 PIN으로 열어요. 관리자 화면 아래에서 언제든 끌 수 있어요.`,
        [
          { text: '켜기', onPress: () => void enable(pin) },
          {
            text: '나중에',
            style: 'cancel',
            onPress: () => void declineBiometricOffer(),
          },
        ]
      );
    },
    [bioLabel, bioEnabled, enable, enableAfterPin]
  );

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
          biometric: bioLabel
            ? {
                label: bioLabel,
                enabled: bioEnabled,
                toggle: () => {
                  if (bioEnabled) {
                    void disableBiometricUnlock();
                    setBioEnabled(false);
                    return;
                  }
                  // 켜려면 PIN이 필요하다: 잠그고 PIN을 한 번 넣게 한다
                  setEnableAfterPin(true);
                  void lockAdmin().finally(recheck);
                },
              }
            : null,
        })}
      </>
    );
  }

  const mode: PinMode = changing
    ? 'change'
    : status?.pin_set
      ? 'unlock'
      : 'set';

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
              key={`${mode}-${bioEnabled}`}
              mode={mode}
              biometric={bioEnabled && !enableAfterPin ? bioLabel : null}
              onDone={(pin) => {
                if (pin) void afterPin(pin, mode);
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
