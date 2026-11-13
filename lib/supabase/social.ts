/**
 * 항목 댓글·이모지 반응 (공간 항목만). 항목 화면을 열 때 받아오고 실시간으로 맞춘다.
 */
import type { ReactionEmoji } from '@/lib/bucket/reactions';

import { supabase } from './client';
import type {
  CommentReactionRow,
  ItemCommentRow,
  ItemReactionRow,
} from './database.types';

/** 고를 수 있는 반응 (서버 표의 check와 같게) */
export {
  QUICK_REACTION_EMOJIS,
  REACTION_EMOJIS,
  type ReactionEmoji,
} from '@/lib/bucket/reactions';

/** 댓글 최대 글자 수 (서버와 같게) */
export const MAX_COMMENT_LENGTH = 300;

export async function fetchItemSocial(itemId: string) {
  const [comments, reactions, commentReactions] = await Promise.all([
    supabase
      .from('item_comments')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: true }),
    supabase.from('item_reactions').select('*').eq('item_id', itemId),
    supabase.from('comment_reactions').select('*').eq('item_id', itemId),
  ]);
  if (comments.error) throw comments.error;
  if (reactions.error) throw reactions.error;
  return {
    comments: comments.data,
    reactions: reactions.data,
    // 댓글 반응을 못 받아도 댓글은 보여준다
    commentReactions: commentReactions.error
      ? ([] as CommentReactionRow[])
      : commentReactions.data,
  };
}

export async function addComment(
  itemId: string,
  spaceId: string,
  userId: string,
  body: string
): Promise<ItemCommentRow> {
  const { data, error } = await supabase
    .from('item_comments')
    // space_id는 서버 트리거가 항목의 공간으로 다시 채운다
    .insert({ item_id: itemId, space_id: spaceId, user_id: userId, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** 내 댓글 고치기 (서버가 edited_at을 찍는다) */
export async function updateComment(
  id: string,
  body: string
): Promise<ItemCommentRow> {
  const { data, error } = await supabase
    .from('item_comments')
    .update({ body })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from('item_comments').delete().eq('id', id);
  if (error) throw error;
}

export async function addReaction(
  itemId: string,
  spaceId: string,
  userId: string,
  emoji: ReactionEmoji
): Promise<ItemReactionRow> {
  const { data, error } = await supabase
    .from('item_reactions')
    .upsert({ item_id: itemId, space_id: spaceId, user_id: userId, emoji })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeReaction(
  itemId: string,
  userId: string,
  emoji: ReactionEmoji
) {
  const { error } = await supabase
    .from('item_reactions')
    .delete()
    .eq('item_id', itemId)
    .eq('user_id', userId)
    .eq('emoji', emoji);
  if (error) throw error;
}

/** 댓글에 반응 남기기 (item_id·space_id는 서버가 댓글에서 채운다) */
export async function addCommentReaction(
  commentId: string,
  userId: string,
  emoji: ReactionEmoji
): Promise<CommentReactionRow> {
  const { data, error } = await supabase
    .from('comment_reactions')
    .upsert({ comment_id: commentId, user_id: userId, emoji })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeCommentReaction(
  commentId: string,
  userId: string,
  emoji: ReactionEmoji
) {
  const { error } = await supabase
    .from('comment_reactions')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .eq('emoji', emoji);
  if (error) throw error;
}

/** 신고 사유 (서버 표의 check와 같게) */
export const REPORT_REASONS = [
  { value: 'spam', label: '스팸·광고' },
  { value: 'abuse', label: '욕설·괴롭힘' },
  { value: 'sexual', label: '음란·불쾌한 내용' },
  { value: 'other', label: '기타' },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

/** 댓글이나 멤버를 신고한다. 운영자만 서버에서 본다 */
export async function reportContent(report: {
  spaceId: string;
  targetUserId: string;
  reason: ReportReason;
  comment?: { id: string; body: string };
}) {
  const { error } = await supabase.from('content_reports').insert({
    space_id: report.spaceId,
    target_user_id: report.targetUserId,
    reason: report.reason,
    comment_id: report.comment?.id,
    comment_body: report.comment?.body,
  });
  if (error) throw error;
}

/** 내가 차단한 사람들의 id */
export async function fetchMyBlocks() {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id');
  if (error) throw error;
  return data.map((b) => b.blocked_id);
}

/** 차단하면 그 사람의 댓글이 나에게 안 보인다 (서버 권한에서 걸러진다) */
export async function blockUser(userId: string) {
  const { error } = await supabase
    .from('user_blocks')
    .upsert({ blocked_id: userId }, { ignoreDuplicates: true });
  if (error) throw error;
}

export async function unblockUser(userId: string) {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocked_id', userId);
  if (error) throw error;
}
