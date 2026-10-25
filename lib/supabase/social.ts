/**
 * 항목 댓글·이모지 반응 (공간 항목만). 항목 화면을 열 때 받아오고 실시간으로 맞춘다.
 */
import { supabase } from './client';
import type { ItemCommentRow, ItemReactionRow } from './database.types';

/** 고를 수 있는 반응 (서버 표의 check와 같게) */
export const REACTION_EMOJIS = ['❤️', '👍', '😆', '🔥', '🥹', '👏'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** 댓글 최대 글자 수 (서버와 같게) */
export const MAX_COMMENT_LENGTH = 300;

export async function fetchItemSocial(itemId: string) {
  const [comments, reactions] = await Promise.all([
    supabase
      .from('item_comments')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: true }),
    supabase.from('item_reactions').select('*').eq('item_id', itemId),
  ]);
  if (comments.error) throw comments.error;
  if (reactions.error) throw reactions.error;
  return { comments: comments.data, reactions: reactions.data };
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
