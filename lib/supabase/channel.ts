import { supabase } from '@/lib/supabase/client';

let opened = 0;

/**
 * 실시간 채널을 새로 연다. 이름 뒤에 번호를 붙여 매번 다른 채널이 되게 한다.
 * supabase.channel()은 같은 이름의 채널이 아직 남아 있으면 그것을 돌려주는데, 채널 닫기는 서버 답을 기다리느라
 * 조금 늦게 끝난다. 그래서 화면이 닫혔다가 바로 다시 열리거나 같은 항목 화면이 둘 열리면 이미 구독한 채널에
 * 다시 .on()을 붙이게 되어 오류로 화면이 죽는다.
 */
export function openChannel(name: string) {
  opened += 1;
  return supabase.channel(`${name}#${opened}`);
}
