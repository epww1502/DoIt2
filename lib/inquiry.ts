/**
 * 앱 안에서 보내는 문의 (도움말 > 문의하기).
 * 보내기는 서버 함수(inquiry)가 한다: 저장하고, 하루에 보낼 수 있는 수를 세고, 관리자 폰에 알림을 보낸다.
 * 문의 목록은 관리자 계정(app_admins)만 읽을 수 있다.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { installedVersion } from '@/lib/appVersion';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

export type InquiryRow = Database['public']['Tables']['inquiries']['Row'];

export const INQUIRY_MAX_LENGTH = 1000;
export const INQUIRY_CONTACT_MAX_LENGTH = 100;

/** 서버가 알려준 실패 이유 → 보여줄 문구 */
export function inquiryErrorMessage(code: string | undefined) {
  if (code === 'too_many') {
    return '오늘은 문의를 많이 보냈어요. 내일 다시 보내주세요.';
  }
  if (code === 'empty') return '문의 내용을 적어주세요.';
  if (code === 'too_long') return '내용이 너무 길어요. 조금 줄여주세요.';
  return '보내지 못했어요. 잠시 후 다시 시도해주세요.';
}

/** 문의를 보낸다. 실패하면 보여줄 문구를 담은 Error를 던진다 */
export async function sendInquiry(message: string, contact: string) {
  const { error } = await supabase.functions.invoke('inquiry', {
    body: {
      message: message.trim(),
      contact: contact.trim() || undefined,
      platform: Platform.OS,
      appVersion: installedVersion(),
    },
  });
  if (!error) return;
  let code: string | undefined;
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as {
      error?: string;
    } | null;
    code = body?.error;
  }
  throw new Error(inquiryErrorMessage(code));
}

/** 받은 문의 (최근 것부터). 관리자가 아니면 자기가 보낸 것만 온다 */
export async function fetchInquiries(): Promise<InquiryRow[]> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

/** 답했는지 표시를 바꾼다 (관리자만) */
export async function setInquiryHandled(id: string, handled: boolean) {
  const { error } = await supabase
    .from('inquiries')
    .update({ handled_at: handled ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}
