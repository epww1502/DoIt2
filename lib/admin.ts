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
