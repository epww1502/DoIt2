/**
 * 처음 쓰는 사람이 어디까지 가는지 세는 기록 (app_steps 표).
 * 단계 이름과 짧은 값만 보낸다. 쓴 글이나 항목 이름은 보내지 않는다.
 * 보내다 실패해도 앱에는 아무 영향이 없다 (기다리지 않고, 오류도 삼킨다).
 */
import { Platform } from 'react-native';

import { installedVersion } from '@/lib/appVersion';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

export type AppStep =
  /** 시작 화면이 떴다 */
  | 'welcome_shown'
  /** 누구와 쓸지 골랐다 (detail: couple·friends·family·solo) */
  | 'who_chosen'
  /** 시작 화면에서 담았다 (detail: "예시 수+직접 만든 수", 안 담았으면 "0+0") */
  | 'items_added'
  /** '직접 해보기'를 열었다 / 끝까지 해서 담았다 */
  | 'guided_opened'
  | 'guided_done'
  /** 초대 글을 보냈다 (detail: 어디서 보냈는지 welcome·home·space) */
  | 'invite_sent'
  /** 초대받아 들어온 사람에게 시작 화면이 떴다 */
  | 'joined_shown'
  /** 초대 코드로 공간에 들어왔다 (detail: 처음 켠 사람 new, 전부터 쓰던 사람 existing) */
  | 'joined'
  /** 처음으로 '오늘 뭐 하지'를 뽑았다 */
  | 'first_pick'
  /** 처음으로 기록을 남겼다 */
  | 'first_record'
  /** 첫 화면의 안내를 눌렀다 (detail: pick·record) */
  | 'tip_tapped'
  // ── 0.3.0 빌드에서 넣은 기능이 실제로 쓰이는지 ──
  /** 다른 앱에서 공유로 넘어와 담기 화면이 열렸다 (detail: map·link·text) */
  | 'share_in'
  /** 홈 화면 위젯을 눌러 앱이 열렸다 */
  | 'widget_open'
  /** 앱 아이콘 꾹 누르기 바로가기로 들어왔다 (detail: add·pick·done) */
  | 'quick_action'
  /** 홈 화면 아이콘을 바꿨다 (detail: 아이콘 이름, 기본이면 default) */
  | 'icon_changed'
  /** 폰 캘린더에 바로 넣기를 눌렀다 */
  | 'calendar_added'
  /** 초대 링크로 앱이 열렸다 (detail: 링크가 바로 앱을 열면 link, 초대 웹 페이지의 '앱에서 열기'면 web) */
  | 'invite_link_open'
  /** 스토어 별점 창을 띄웠다 */
  | 'review_asked'
  // ── 도움말: 무엇을 찾아봤는지 (많이 열린 질문이 곧 고칠 화면이다) ──
  /** 질문을 펼쳤다 (detail: 질문 id) */
  | 'faq_opened'
  /** 답의 단계를 눌러 그 화면으로 갔다 (detail: 질문 id:화면 주소) */
  | 'faq_step'
  /** 문의하기를 눌렀다 */
  | 'faq_contact'
  /** 문의를 보냈다 (detail: 연락처를 적었으면 contact, 아니면 no_contact) */
  | 'inquiry_sent';

const sent = new Set<string>();

/** 단계를 한 번 기록한다 (같은 단계·값은 앱을 켜 둔 동안 한 번만) */
export function trackStep(step: AppStep, detail?: string) {
  if (__DEV__ || !isSupabaseConfigured) return;
  const key = `${step}:${detail ?? ''}`;
  if (sent.has(key)) return;
  sent.add(key);
  void (async () => {
    try {
      // 로그인 전이면 누구의 기록인지 알 수 없어서 보내지 않는다
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      await supabase.from('app_steps').insert({
        step,
        detail: detail?.slice(0, 40) ?? null,
        platform: Platform.OS,
        app_version: installedVersion(),
      });
    } catch {
      // 세는 것뿐이라 실패해도 그냥 둔다
    }
  })();
}
