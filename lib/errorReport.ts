/**
 * 앱 오류를 서버 app_errors 표에 남긴다 (오류 수집 도구 대신).
 * - 먼저 폰에 적어 두고 보낸다. 앱이 꺼지거나 인터넷이 없어도 다음에 켤 때 보낸다
 * - 같은 오류는 앱이 켜져 있는 동안 한 번만 남긴다
 * - 개발 중에는 남기지 않는다
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import { installedVersion } from '@/lib/appVersion';
import { isNetworkError } from '@/lib/connection';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

const PENDING_KEY = 'app-errors:pending';
/** 폰에 모아 둘 최대 개수 (오래된 것부터 버린다) */
const MAX_PENDING = 20;

/** crash: 처리되지 않아 앱이 꺼짐 / screen: 화면을 그리다 터짐 / alert: 사용자에게 오류 팝업을 띄움 */
export type ErrorReportKind = 'crash' | 'screen' | 'alert';

export type ErrorRow = {
  occurred_at: string;
  kind: ErrorReportKind;
  platform: string;
  app_version: string;
  update_id: string | null;
  title: string | null;
  message: string;
  stack: string | null;
};

const cut = (text: string | null | undefined, max: number) =>
  text ? text.slice(0, max) : null;

/** 무엇이 던져졌든 서버 표 한 줄로 (칸 길이 제한에 맞춰 자른다) */
export function toErrorRow(
  kind: ErrorReportKind,
  e: unknown,
  title?: string
): ErrorRow {
  const err = (e ?? {}) as {
    message?: unknown;
    stack?: unknown;
    code?: unknown;
  };
  const base =
    typeof err.message === 'string' && err.message ? err.message : String(e);
  // 서버 오류는 코드가 있어야 무엇인지 안다
  const message = typeof err.code === 'string' ? `[${err.code}] ${base}` : base;
  return {
    occurred_at: new Date().toISOString(),
    kind,
    platform: Platform.OS,
    app_version: installedVersion().slice(0, 20),
    update_id: cut(Updates.updateId, 64),
    title: cut(title, 200),
    message: message.slice(0, 1000),
    stack: typeof err.stack === 'string' ? cut(err.stack, 4000) : null,
  };
}

const seen = new Set<string>();

async function readPending(): Promise<ErrorRow[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as ErrorRow[]) : [];
  } catch {
    return [];
  }
}

/** 오류를 폰에 적어 둔다 (보내기는 기다리지 않는다). 다 적으면 끝난다 */
export async function reportError(
  kind: ErrorReportKind,
  e: unknown,
  title?: string
) {
  if (__DEV__ || !isSupabaseConfigured) return;
  const row = toErrorRow(kind, e, title);
  const key = `${kind}:${row.message}`;
  if (seen.has(key)) return;
  seen.add(key);
  try {
    const pending = await readPending();
    await AsyncStorage.setItem(
      PENDING_KEY,
      JSON.stringify([...pending, row].slice(-MAX_PENDING))
    );
  } catch {
    return;
  }
  void flushErrors();
}

let flushing: Promise<void> | null = null;

/** 폰에 적어 둔 오류를 서버로 보낸다. 앱을 켤 때도 부른다. 이미 보내는 중이면 그걸 기다린다 */
export function flushErrors() {
  if (!isSupabaseConfigured) return Promise.resolve();
  flushing ??= sendPending().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function sendPending() {
  try {
    const pending = await readPending();
    if (pending.length === 0) return;
    const { error } = await supabase.from('app_errors').insert(pending);
    // 인터넷 문제면 다음에 다시. 그 밖의 실패(표가 거절)는 계속 막히지 않게 버린다
    if (error && isNetworkError(error)) return;
    // 보내는 사이 새로 적힌 것은 남긴다
    const now = await readPending();
    await AsyncStorage.setItem(
      PENDING_KEY,
      JSON.stringify(now.slice(pending.length))
    );
  } catch {
    // 다음에 다시
  }
}

/** 처리되지 않은 오류도 남긴다. 앱이 꺼지기 전에 폰에 적을 시간을 잠깐 준다 (한 번만 부른다) */
export function installCrashReporter() {
  const utils = (
    globalThis as {
      ErrorUtils?: {
        getGlobalHandler: () => (e: unknown, isFatal?: boolean) => void;
        setGlobalHandler: (h: (e: unknown, isFatal?: boolean) => void) => void;
      };
    }
  ).ErrorUtils;
  if (!utils) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((e, isFatal) => {
    const wait = new Promise((resolve) => setTimeout(resolve, 800));
    void Promise.race([
      reportError('crash', e, isFatal ? '앱이 꺼짐' : '처리되지 않은 오류'),
      wait,
    ]).finally(() => previous(e, isFatal));
  });
  void flushErrors();
}
