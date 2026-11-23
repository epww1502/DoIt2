/**
 * 관리자 모드 (설정 > 관리자 모드). 관리자 계정(서버의 app_admins)에만 보인다.
 * 누가 관리자인지는 서버가 판단한다: 앱에서 줄을 숨기는 것은 보기 좋으라고 하는 것일 뿐이고,
 * 관리자가 아닌 계정이 이 함수들을 불러도 서버가 거절한다.
 * 관리자 계정이어도 PIN을 서버가 확인한 뒤 15분 동안만 자료를 준다 (폰이나 계정 코드가 남의 손에 들어갔을 때를 막는다).
 */
import { supabase } from '@/lib/supabase/client';

export type AdminOverview = {
  users: number;
  new_users_7d: number;
  active_users_7d: number;
  spaces: number;
  shared_spaces: number;
  items: number;
  records: number;
  open_inquiries: number;
};

export type AdminSpace = {
  id: string;
  name: string;
  emoji: string;
  personal: boolean;
  created_at: string;
  members: number;
  items: number;
  records: number;
  last_activity: string | null;
};

export type AdminUser = {
  id: string;
  nickname: string | null;
  joined: string;
  last_used: string | null;
  spaces: number;
  items: number;
  /** 마지막으로 쓴 폰 종류와 앱 버전 (예: 'android 0.3.0'). 기록이 없으면 null */
  app: string | null;
};

export type AdminDashboard = {
  overview: AdminOverview;
  spaces: AdminSpace[];
  users: AdminUser[];
};

/** 서버가 알려주는 관리자 상태 */
export type AdminStatus = {
  /** 이 계정이 관리자인지 */
  admin: boolean;
  /** PIN을 정해 두었는지 (아직이면 먼저 정해야 한다) */
  pin_set?: boolean;
  /** PIN으로 열어 둔 15분 안인지 */
  unlocked?: boolean;
  /** 여러 번 틀려서 잠겼으면 풀리는 시각 */
  locked_until?: string | null;
};

/** PIN 확인·설정의 결과 */
export type PinResult = {
  ok: boolean;
  reason?: 'wrong' | 'locked' | 'bad_pin' | 'no_pin' | 'not_admin';
  /** 잠기기까지 남은 횟수 */
  left?: number;
  locked_until?: string | null;
};

export const ADMIN_PIN_LENGTH = 6;

/** 지금 계정의 관리자 상태 (모르면 관리자가 아니라고 본다) */
export async function fetchAdminStatus(): Promise<AdminStatus> {
  const { data, error } = await supabase.rpc('admin_status');
  if (error || !data) return { admin: false };
  return data as unknown as AdminStatus;
}

/** PIN을 확인하고 맞으면 15분 동안 연다 */
export async function unlockAdmin(pin: string): Promise<PinResult> {
  const { data, error } = await supabase.rpc('admin_unlock', { pin });
  if (error) throw error;
  return data as unknown as PinResult;
}

/** PIN을 정하거나 바꾼다 (바꿀 때는 지금 PIN이 맞아야 한다) */
export async function setAdminPin(
  newPin: string,
  oldPin?: string
): Promise<PinResult> {
  const { data, error } = await supabase.rpc('admin_set_pin', {
    new_pin: newPin,
    old_pin: oldPin,
  });
  if (error) throw error;
  return data as unknown as PinResult;
}

/** 바로 잠근다 */
export async function lockAdmin() {
  await supabase.rpc('admin_lock');
}

/** 잠긴 시각을 '오후 3:20' 같은 말로 */
function clock(iso: string | null | undefined) {
  if (!iso) return '잠시';
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours < 12 ? '오전' : '오후'} ${hours % 12 || 12}:${minutes}`;
}

/** PIN 확인이 실패했을 때 보여줄 문구 */
export function pinFailureMessage(result: PinResult) {
  if (result.reason === 'locked') {
    return `여러 번 틀려서 잠겼어요. ${clock(result.locked_until)} 뒤에 다시 해주세요.`;
  }
  if (result.reason === 'wrong') {
    return result.left
      ? `PIN이 맞지 않아요. ${result.left}번 더 틀리면 1시간 동안 잠겨요.`
      : 'PIN이 맞지 않아요.';
  }
  if (result.reason === 'bad_pin') {
    return `PIN은 숫자 ${ADMIN_PIN_LENGTH}자리로 정해주세요.`;
  }
  if (result.reason === 'not_admin') return '관리자 계정이 아니에요.';
  return '확인하지 못했어요. 다시 해주세요.';
}

/** 요약 숫자와 공간·사용자 목록. 관리자가 아니면 서버가 거절해서 던진다 */
export async function fetchAdminDashboard(): Promise<AdminDashboard> {
  const { data, error } = await supabase.rpc('admin_dashboard');
  if (error) throw error;
  return data as unknown as AdminDashboard;
}

/** 관리자 모드 > 로그 */
export type AdminErrorGroup = {
  kind: string;
  title: string;
  count: number;
  users: number;
  last_at: string;
  /** 이 오류가 난 기기·버전들 (예: 'android 0.3.0, ios 0.3.0') */
  versions: string;
};

export type AdminErrorRow = {
  id: number;
  occurred_at: string;
  kind: string;
  platform: string;
  app_version: string | null;
  update_id: string | null;
  title: string | null;
  message: string;
  stack: string | null;
  user_id: string | null;
  nickname: string | null;
};

export type AdminStepGroup = { step: string; events: number; users: number };

export type AdminStepRow = {
  created_at: string;
  step: string;
  detail: string | null;
  platform: string | null;
  app_version: string | null;
  user_id: string;
  nickname: string | null;
};

export type AdminAiRow = {
  created_at: string;
  action: string;
  outcome: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  ms: number | null;
  user_id: string;
  nickname: string | null;
};

export type AdminLogs = {
  days: number;
  errors: {
    total: number;
    users: number;
    groups: AdminErrorGroup[];
    recent: AdminErrorRow[];
  };
  steps: {
    groups: AdminStepGroup[];
    daily: { day: string; events: number; users: number }[];
    recent: AdminStepRow[];
  };
  ai: {
    summary: {
      calls: number;
      ok: number;
      failed: number;
      limited: number;
      users: number;
      input_tokens: number;
      output_tokens: number;
      avg_ms: number;
      est_usd: number;
    };
    recent: AdminAiRow[];
  };
};

/** 오류·기능 사용·AI 호출의 요약과 최근 기록 (days일 동안). 관리자가 아니면 서버가 거절해서 던진다 */
export async function fetchAdminLogs(days: number): Promise<AdminLogs> {
  const { data, error } = await supabase.rpc('admin_logs', { days });
  if (error) throw error;
  return data as unknown as AdminLogs;
}

/** 기능 사용 기록(app_steps)의 이름을 사람이 읽는 말로. 모르는 이름은 그대로 */
const STEP_LABELS: Record<string, string> = {
  welcome_shown: '시작 화면 열림',
  who_chosen: '누구와 쓸지 고름',
  items_added: '시작 화면에서 담음',
  guided_opened: '직접 해보기 열림',
  guided_done: '직접 해보기로 담음',
  invite_sent: '초대 보냄',
  joined_shown: '초대받은 시작 화면',
  joined: '초대로 공간에 들어옴',
  first_pick: '처음 뽑기',
  first_record: '처음 기록',
  tip_tapped: '첫 화면 안내 누름',
  share_in: '공유로 담기',
  widget_open: '위젯으로 열기',
  quick_action: '아이콘 꾹 누르기 메뉴',
  icon_changed: '앱 아이콘 바꿈',
  calendar_added: '캘린더에 넣음',
  invite_link_open: '초대 링크로 열림',
  review_asked: '별점 요청 띄움',
  faq_opened: '도움말 질문 펼침',
  faq_step: '도움말에서 화면으로 감',
  faq_contact: '도움말에서 문의하기 누름',
  inquiry_sent: '문의 보냄',
};

export const stepLabel = (step: string) => STEP_LABELS[step] ?? step;

const AI_ACTION_LABELS: Record<string, string> = {
  suggest: 'AI 추천',
  classify: '분류',
  fill: '채우기',
  parse: '말하듯 담기',
  split: '나누기',
  usage: '남은 횟수',
};

export const aiActionLabel = (action: string) =>
  AI_ACTION_LABELS[action] ?? action;

const AI_OUTCOME_LABELS: Record<string, string> = {
  ok: '성공',
  failed: '실패',
  limit_user: '한도(사람)',
  limit_global: '한도(전체)',
};

export const aiOutcomeLabel = (outcome: string) =>
  AI_OUTCOME_LABELS[outcome] ?? outcome;

const ERROR_KIND_LABELS: Record<string, string> = {
  crash: '앱 꺼짐',
  screen: '화면 오류',
  alert: '오류 안내',
};

export const errorKindLabel = (kind: string) => ERROR_KIND_LABELS[kind] ?? kind;

/** 로그 줄에 쓸 사람 이름: 닉네임, 없으면 계정 id 앞 4자리 */
export const whoLabel = (userId: string | null, nickname: string | null) =>
  nickname?.trim() ||
  (userId ? `이름 없음 · ${userId.slice(0, 4)}` : '알 수 없음');

/** 오류 한 건을 복사해 붙여 넣기 좋게 (원인 찾을 때) */
export function errorReportText(row: AdminErrorRow) {
  return [
    `[${errorKindLabel(row.kind)}] ${row.title ?? ''}`.trim(),
    `${row.occurred_at} · ${row.platform} ${row.app_version ?? '?'}${row.update_id ? ` · update ${row.update_id}` : ''}`,
    row.user_id ? `user ${row.user_id}` : null,
    '',
    row.message,
    row.stack ? `\n${row.stack}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');
}
