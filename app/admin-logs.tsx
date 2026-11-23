import dayjs from 'dayjs';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, NavBar, Segmented, Text } from '@/components/atoms';
import { AdminGate } from '@/components/admin/AdminGate';
import { useLoad } from '@/hooks/useLoad';
import {
  type AdminAiRow,
  type AdminErrorRow,
  type AdminLogs,
  type AdminStepRow,
  aiActionLabel,
  aiOutcomeLabel,
  errorKindLabel,
  errorReportText,
  fetchAdminLogs,
  stepLabel,
  whoLabel,
} from '@/lib/admin';
import { copyText } from '@/lib/clipboard';
import { cn } from '@/lib/utils';

type Tab = 'errors' | 'steps' | 'ai';
type Days = '1' | '7' | '30';

const time = (iso: string) => dayjs(iso).format('M/D HH:mm');

/**
 * 관리자 모드 > 로그: 앱 오류, 기능 사용, AI 호출.
 * 위는 고른 기간의 요약, 아래는 기간과 상관없이 최근 기록이다.
 * 관리자가 PIN으로 연 동안만 서버가 준다 (담은 항목의 내용이나 쓴 글은 없다).
 */
export default function AdminLogsScreen() {
  return (
    <AdminGate title="로그">
      {(controls) => <Logs onRetry={controls.recheck} />}
    </AdminGate>
  );
}

function Logs({ onRetry }: { onRetry: () => void }) {
  const [tab, setTab] = useState<Tab>('errors');
  const [days, setDays] = useState<Days>('7');
  const { state } = useLoad(() => fetchAdminLogs(Number(days)), [days]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="로그" />
      <View className="gap-2 px-5 pb-3">
        <Segmented<Tab>
          options={[
            { value: 'errors', label: '오류' },
            { value: 'steps', label: '기능 사용' },
            { value: 'ai', label: 'AI' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Segmented<Days>
          options={[
            { value: '1', label: '오늘' },
            { value: '7', label: '7일' },
            { value: '30', label: '30일' },
          ]}
          value={days}
          onChange={setDays}
        />
      </View>
      {state.status === 'loading' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : state.status === 'error' ? (
        // 열어 둔 15분이 지났으면 서버가 거절한다. 다시 확인해서 PIN을 묻는다
        <ErrorState title="불러오지 못했어요" onRetry={onRetry} />
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-5 pb-10">
          {tab === 'errors' ? (
            <ErrorsTab logs={state.data} />
          ) : tab === 'steps' ? (
            <StepsTab logs={state.data} />
          ) : (
            <AiTab logs={state.data} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <View className="gap-0.5">
        <Text weight="700" size={16}>
          {title}
        </Text>
        {hint ? (
          <Text size={12} className="text-muted-foreground">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Text size={13} className="py-2 text-muted-foreground">
      {text}
    </Text>
  );
}

/** 이름과 숫자 한 줄 (요약 목록) */
function CountRow({
  title,
  sub,
  count,
}: {
  title: string;
  sub?: string;
  count: string;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent">
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={14} numberOfLines={2}>
          {title}
        </Text>
        {sub ? (
          <Text size={12} className="text-muted-foreground" numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Text weight="700" size={15}>
        {count}
      </Text>
    </View>
  );
}

function ErrorsTab({ logs }: { logs: AdminLogs }) {
  const { errors } = logs;
  return (
    <>
      <Section
        title={`${logs.days}일 동안 ${errors.total}건 · ${errors.users}명`}
        hint="같은 오류끼리 묶어서 많이 난 순서로"
      >
        {errors.groups.length === 0 ? (
          <Empty text="이 기간에 난 오류가 없어요" />
        ) : (
          errors.groups.map((group) => (
            <CountRow
              key={`${group.kind}:${group.title}`}
              title={group.title}
              sub={`${errorKindLabel(group.kind)} · ${group.users}명 · 마지막 ${time(group.last_at)} · ${group.versions}`}
              count={`${group.count}건`}
            />
          ))
        )}
      </Section>
      <Section title="최근 오류" hint="눌러서 자세히 보기, 길게 눌러 복사">
        {errors.recent.length === 0 ? (
          <Empty text="기록된 오류가 없어요" />
        ) : (
          errors.recent.map((row) => <ErrorLogRow key={row.id} row={row} />)
        )}
      </Section>
    </>
  );
}

function ErrorLogRow({ row }: { row: AdminErrorRow }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen((value) => !value)}
      onLongPress={() =>
        void copyText(errorReportText(row), '오류 내용을 복사했어요')
      }
      className="gap-1 rounded-2xl px-4 py-3 bg-accent active:opacity-80"
    >
      <View className="flex-row items-center gap-2">
        <Text
          size={11}
          weight="600"
          className={cn(
            'rounded-full px-2 py-0.5',
            row.kind === 'crash'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-background text-muted-foreground'
          )}
        >
          {errorKindLabel(row.kind)}
        </Text>
        <Text size={12} className="flex-1 text-muted-foreground">
          {`${time(row.occurred_at)} · ${row.platform} ${row.app_version ?? '?'}`}
        </Text>
      </View>
      <Text weight="600" size={14} numberOfLines={open ? undefined : 1}>
        {row.title ?? row.message}
      </Text>
      {open ? (
        <View className="gap-1 pt-1">
          <Text size={12} className="text-muted-foreground">
            {whoLabel(row.user_id, row.nickname)}
            {row.update_id ? ` · 업데이트 ${row.update_id.slice(0, 8)}` : ''}
          </Text>
          {row.title ? <Text size={13}>{row.message}</Text> : null}
          {row.stack ? (
            <Text size={11} className="text-muted-foreground" selectable>
              {row.stack}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function StepsTab({ logs }: { logs: AdminLogs }) {
  const { steps } = logs;
  return (
    <>
      <Section
        title={`${logs.days}일 동안 많이 쓴 기능`}
        hint="몇 번 · 몇 명 (같은 사람이 같은 걸 앱을 켤 때마다 한 번씩 셈)"
      >
        {steps.groups.length === 0 ? (
          <Empty text="이 기간에 기록이 없어요" />
        ) : (
          steps.groups.map((group) => (
            <CountRow
              key={group.step}
              title={stepLabel(group.step)}
              sub={`${group.users}명`}
              count={`${group.events}번`}
            />
          ))
        )}
      </Section>
      <Section title="날짜별">
        {steps.daily.length === 0 ? (
          <Empty text="이 기간에 기록이 없어요" />
        ) : (
          steps.daily.map((day) => (
            <CountRow
              key={day.day}
              title={dayjs(day.day).format('M월 D일 (dd)')}
              sub={`${day.users}명`}
              count={`${day.events}번`}
            />
          ))
        )}
      </Section>
      <Section title="최근 기록">
        {steps.recent.length === 0 ? (
          <Empty text="기록이 없어요" />
        ) : (
          steps.recent.map((row, i) => (
            <StepLogRow key={`${row.created_at}:${i}`} row={row} />
          ))
        )}
      </Section>
    </>
  );
}

function StepLogRow({ row }: { row: AdminStepRow }) {
  return (
    <View className="gap-0.5 rounded-2xl px-4 py-2.5 bg-accent">
      <View className="flex-row items-center gap-2">
        <Text weight="600" size={14} className="flex-1" numberOfLines={1}>
          {stepLabel(row.step)}
          {row.detail ? ` · ${row.detail}` : ''}
        </Text>
        <Text size={12} className="text-muted-foreground">
          {time(row.created_at)}
        </Text>
      </View>
      <Text size={12} className="text-muted-foreground" numberOfLines={1}>
        {`${whoLabel(row.user_id, row.nickname)} · ${row.platform ?? '?'} ${row.app_version ?? ''}`}
      </Text>
    </View>
  );
}

function AiTab({ logs }: { logs: AdminLogs }) {
  const { summary, recent } = logs.ai;
  return (
    <>
      <Section title={`${logs.days}일 동안`}>
        <CountRow
          title="부른 횟수"
          sub={`성공 ${summary.ok} · 실패 ${summary.failed} · 한도에 걸림 ${summary.limited} · ${summary.users}명`}
          count={`${summary.calls}번`}
        />
        <CountRow
          title="토큰과 비용 (추정)"
          sub={`입력 ${summary.input_tokens.toLocaleString()} · 출력 ${summary.output_tokens.toLocaleString()} · 평균 ${(summary.avg_ms / 1000).toFixed(1)}초`}
          count={`$${Number(summary.est_usd).toFixed(4)}`}
        />
      </Section>
      <Section title="최근 호출">
        {recent.length === 0 ? (
          <Empty text="기록이 없어요" />
        ) : (
          recent.map((row, i) => (
            <AiLogRow key={`${row.created_at}:${i}`} row={row} />
          ))
        )}
      </Section>
    </>
  );
}

function AiLogRow({ row }: { row: AdminAiRow }) {
  return (
    <View className="gap-0.5 rounded-2xl px-4 py-2.5 bg-accent">
      <View className="flex-row items-center gap-2">
        <Text weight="600" size={14} className="flex-1" numberOfLines={1}>
          {`${aiActionLabel(row.action)} · ${aiOutcomeLabel(row.outcome)}`}
        </Text>
        <Text size={12} className="text-muted-foreground">
          {time(row.created_at)}
        </Text>
      </View>
      <Text size={12} className="text-muted-foreground" numberOfLines={1}>
        {[
          whoLabel(row.user_id, row.nickname),
          row.ms != null ? `${(row.ms / 1000).toFixed(1)}초` : null,
          row.input_tokens != null
            ? `토큰 ${row.input_tokens}+${row.output_tokens ?? 0}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </View>
  );
}
