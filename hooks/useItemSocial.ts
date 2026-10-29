import { useEffect, useState } from 'react';

import { noteFailure } from '@/lib/connection';
import { notifySpace } from '@/lib/push';
import { supabase } from '@/lib/supabase/client';
import type {
  ItemCommentRow,
  ItemReactionRow,
} from '@/lib/supabase/database.types';
import {
  addComment,
  addReaction,
  deleteComment,
  fetchItemSocial,
  removeReaction,
  updateComment,
  type ReactionEmoji,
} from '@/lib/supabase/social';
import { useLoad } from '@/hooks/useLoad';
import { useSpaceStore } from '@/store/useSpaceStore';

type Social = { comments: ItemCommentRow[]; reactions: ItemReactionRow[] };

const sameReaction = (a: ItemReactionRow, b: Partial<ItemReactionRow>) =>
  a.item_id === b.item_id && a.user_id === b.user_id && a.emoji === b.emoji;

/**
 * 항목 하나의 댓글·반응. 열 때 받아오고, 다른 사람이 남기면 실시간으로 더한다.
 * 쓰기는 화면에 먼저 반영하고, 서버에서 실패하면 되돌린 뒤 던진다.
 */
export function useItemSocial(itemId: string, spaceId: string | null) {
  const userId = useSpaceStore((s) => s.userId);
  const { state, reload } = useLoad(() => fetchItemSocial(itemId), [itemId]);
  // 받아온 값 위에 실시간·내 변경을 얹는다
  const [data, setData] = useState<Social | null>(null);
  const [loadedFor, setLoadedFor] = useState<unknown>(null);
  if (state.status === 'ready' && loadedFor !== state.data) {
    setLoadedFor(state.data);
    setData(state.data);
  }

  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase
      .channel(`item-social-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'item_comments',
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          const row = payload.new as ItemCommentRow;
          setData((d) =>
            d && !d.comments.some((c) => c.id === row.id)
              ? { ...d, comments: [...d.comments, row] }
              : d
          );
        }
      )
      // 누가 댓글을 고쳤다
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'item_comments',
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          const row = payload.new as ItemCommentRow;
          setData((d) =>
            d
              ? {
                  ...d,
                  comments: d.comments.map((c) => (c.id === row.id ? row : c)),
                }
              : d
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'item_comments' },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          setData((d) =>
            d ? { ...d, comments: d.comments.filter((c) => c.id !== id) } : d
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'item_reactions',
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          const row = payload.new as ItemReactionRow;
          setData((d) =>
            d && !d.reactions.some((r) => sameReaction(r, row))
              ? { ...d, reactions: [...d.reactions, row] }
              : d
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'item_reactions' },
        (payload) => {
          const old = payload.old as Partial<ItemReactionRow>;
          setData((d) =>
            d
              ? {
                  ...d,
                  reactions: d.reactions.filter((r) => !sameReaction(r, old)),
                }
              : d
          );
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [itemId, spaceId]);

  const toggleReaction = async (emoji: ReactionEmoji) => {
    if (!data || !userId || !spaceId) return;
    const mine = { item_id: itemId, user_id: userId, emoji };
    const had = data.reactions.some((r) => sameReaction(r, mine));
    const before = data;
    setData({
      ...data,
      reactions: had
        ? data.reactions.filter((r) => !sameReaction(r, mine))
        : [
            ...data.reactions,
            {
              ...mine,
              space_id: spaceId,
              created_at: new Date().toISOString(),
            },
          ],
    });
    try {
      if (had) await removeReaction(itemId, userId, emoji);
      else await addReaction(itemId, spaceId, userId, emoji);
    } catch (e) {
      noteFailure(e);
      setData(before);
      throw e;
    }
  };

  const sendComment = async (body: string) => {
    const text = body.trim();
    if (!text || !userId || !spaceId) return;
    const row = await addComment(itemId, spaceId, userId, text).catch(
      (e: unknown) => {
        noteFailure(e);
        throw e;
      }
    );
    setData((d) =>
      d && !d.comments.some((c) => c.id === row.id)
        ? { ...d, comments: [...d.comments, row] }
        : d
    );
    notifySpace(spaceId, 'commented', [itemId]);
  };

  /** 내 댓글 고치기. 실패하면 되돌리고 던진다 */
  const editComment = async (id: string, body: string) => {
    const text = body.trim();
    if (!data || !text) return;
    const before = data;
    setData({
      ...data,
      comments: data.comments.map((c) =>
        c.id === id
          ? { ...c, body: text, edited_at: new Date().toISOString() }
          : c
      ),
    });
    try {
      const row = await updateComment(id, text);
      setData((d) =>
        d
          ? { ...d, comments: d.comments.map((c) => (c.id === id ? row : c)) }
          : d
      );
    } catch (e) {
      noteFailure(e);
      setData(before);
      throw e;
    }
  };

  const removeComment = async (id: string) => {
    if (!data) return;
    const before = data;
    setData({ ...data, comments: data.comments.filter((c) => c.id !== id) });
    try {
      await deleteComment(id);
    } catch (e) {
      noteFailure(e);
      setData(before);
      throw e;
    }
  };

  return {
    state,
    data,
    userId,
    reload,
    toggleReaction,
    sendComment,
    editComment,
    removeComment,
  };
}
