/**
 * 계정 코드와 프로필.
 * - 계정 코드: 익명 계정을 다른 폰에서 다시 불러오는 비밀 코드 (Edge Function account-code)
 * - 프로필: 닉네임(선택)·프로필 사진. 공간 멤버 목록에 보인다 (공개는 공간마다 따로)
 */
import { removePhoto, uploadPhoto } from './bucketRemote';
import { supabase } from './client';
import type { MemberProfile, ProfileRow } from './database.types';

/** 내 계정 코드를 새로 만든다. 예전 코드는 더 이상 못 쓴다 */
export async function issueAccountCode() {
  const { data, error } = await supabase.functions.invoke<{ code: string }>(
    'account-code',
    { body: { action: 'issue' } }
  );
  if (error || !data?.code) {
    throw new Error('코드를 만들지 못했어요. 잠시 후 다시 시도해주세요.');
  }
  return data.code;
}

/** 코드의 계정으로 이 폰을 로그인시킨다. 성공하면 그 계정의 user id */
export async function signInWithAccountCode(code: string) {
  const { data, error } = await supabase.functions.invoke<{
    access_token: string;
    refresh_token: string;
  }>('account-code', { body: { action: 'restore', code } });
  if (error || !data?.access_token) {
    const status = (error as { context?: Response } | null)?.context?.status;
    throw new Error(
      status === 404 || status === 400
        ? '계정 코드가 맞지 않아요. 다시 확인해주세요.'
        : '불러오지 못했어요. 잠시 후 다시 시도해주세요.'
    );
  }
  const { data: session, error: sessionError } =
    await supabase.auth.setSession(data);
  if (sessionError || !session.user) {
    throw new Error('불러오지 못했어요. 잠시 후 다시 시도해주세요.');
  }
  return session.user.id;
}

/** 내 프로필 (아직 안 만들었으면 null) */
export async function fetchMyProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveMyProfile(
  userId: string,
  prev: ProfileRow | null,
  patch: {
    nickname: string | null;
    /** 새 사진(휴대폰 파일), null: 사진 빼기, undefined: 그대로 */
    avatarUri?: string | null;
  }
) {
  let avatarPath = prev?.avatar_path ?? null;
  if (patch.avatarUri) {
    // 내 폴더(avatars/{내 id})에 올린다. 같은 공간 사람만 볼 수 있다
    avatarPath = await uploadPhoto(patch.avatarUri, `avatars/${userId}`);
  } else if (patch.avatarUri === null) {
    avatarPath = null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      nickname: patch.nickname,
      avatar_path: avatarPath,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  // 바뀌었거나 뺀 예전 사진은 지운다
  if (prev?.avatar_path && prev.avatar_path !== avatarPath) {
    void removePhoto(prev.avatar_path).catch(() => {});
  }
  return data;
}

/**
 * 이 공간에서의 내 프로필: 공개 여부와 이 공간에서만 쓸 닉네임·사진.
 * 닉네임·사진이 비면 기본 프로필을 보여준다.
 */
export async function saveSpaceProfile(
  userId: string,
  spaceId: string,
  prevAvatarPath: string | null,
  patch: {
    visible: boolean;
    nickname: string | null;
    /** 새 사진(휴대폰 파일), null: 빼기(기본 사진으로), undefined: 그대로 */
    avatarUri?: string | null;
  }
) {
  let avatarPath = prevAvatarPath;
  if (patch.avatarUri) {
    avatarPath = await uploadPhoto(patch.avatarUri, `avatars/${userId}`);
  } else if (patch.avatarUri === null) {
    avatarPath = null;
  }
  const { error } = await supabase.rpc('set_space_profile', {
    target_space: spaceId,
    visible: patch.visible,
    space_nickname: patch.nickname,
    space_avatar_path: avatarPath,
  });
  if (error) throw error;
  if (prevAvatarPath && prevAvatarPath !== avatarPath) {
    void removePhoto(prevAvatarPath).catch(() => {});
  }
}

/** 공간 멤버들 (들어온 순). 이 공간에서 공개를 끈 사람은 닉네임·사진이 비어서 온다 */
export async function fetchSpaceMembers(spaceId: string) {
  const { data, error } = await supabase.rpc('space_member_profiles', {
    target_space: spaceId,
  });
  if (error) throw error;
  return data as MemberProfile[];
}

const OWNER_ERRORS: Record<string, string> = {
  not_owner: '공간장만 할 수 있어요.',
  not_member: '이 공간 멤버가 아니에요.',
  cannot_kick_self: '나 자신은 내보낼 수 없어요.',
};

function ownerError(message: string) {
  const key = Object.keys(OWNER_ERRORS).find((k) => message.includes(k));
  return new Error(
    key ? OWNER_ERRORS[key] : '하지 못했어요. 잠시 후 다시 시도해주세요.'
  );
}

/** 공간장 넘겨주기 (공간장만) */
export async function transferSpaceOwner(spaceId: string, newOwner: string) {
  const { error } = await supabase.rpc('transfer_space_owner', {
    target_space: spaceId,
    new_owner: newOwner,
  });
  if (error) throw ownerError(error.message);
}

/** 멤버 내보내기 (공간장만) */
export async function kickSpaceMember(spaceId: string, member: string) {
  const { error } = await supabase.rpc('kick_space_member', {
    target_space: spaceId,
    member,
  });
  if (error) throw ownerError(error.message);
}

/** 초대 코드 바꾸기 (공간장만). 새 코드를 돌려준다 */
export async function resetInviteCode(spaceId: string) {
  const { data, error } = await supabase.rpc('reset_invite_code', {
    target_space: spaceId,
  });
  if (error) throw ownerError(error.message);
  return data;
}

/**
 * 내 계정 지우기 (되돌릴 수 없다). 혼자 있는 공간은 통째로, 함께 쓰는 공간은 나가기만 한다.
 * 성공하면 이 폰의 로그인도 끊는다.
 */
export async function deleteMyAccount() {
  const { error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });
  if (error) {
    throw new Error('계정을 지우지 못했어요. 잠시 후 다시 시도해주세요.');
  }
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}
