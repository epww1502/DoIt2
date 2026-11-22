import { Share } from 'react-native';

import { inviteMessage } from '@/lib/inviteLink';
import { trackStep } from '@/lib/steps';

type InviteSpace = Parameters<typeof inviteMessage>[0];

/**
 * 초대 글을 공유 창으로 보낸다. 어디서 보냈는지(from)를 같이 센다.
 * 공유 창을 그냥 닫은 것은 보낸 것으로 세지 않는다 (아이폰만 알 수 있다. 안드로이드는 닫아도 보낸 것으로 온다).
 */
export async function shareInvite(
  space: InviteSpace,
  from: 'welcome' | 'home' | 'space'
) {
  try {
    const result = await Share.share({ message: inviteMessage(space) });
    if (result.action !== Share.dismissedAction) trackStep('invite_sent', from);
  } catch {
    // 공유 창을 못 띄웠다. 보낸 것으로 세지 않는다
  }
}
