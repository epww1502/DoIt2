import dayjs from 'dayjs';
import {
  Check,
  Ellipsis,
  SendHorizontal,
  SmilePlus,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';

import { ActionSheet, Icon, InlineError, Text } from '@/components/atoms';
import { PersonAvatar } from '@/components/space/PersonAvatar';
import { askBlock, askReport } from '@/components/space/spaceFlow';
import { useItemSocial } from '@/hooks/useItemSocial';
import type { ItemCommentRow } from '@/lib/supabase/database.types';
import { themeColors } from '@/constants/colors';
import { FONT_WEIGHTS } from '@/constants/fonts';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { showAlert } from '@/lib/dialog';
import { showErrorAlert } from '@/lib/errors';
import {
  MAX_COMMENT_LENGTH,
  REACTION_EMOJIS,
  type ReactionEmoji,
} from '@/lib/supabase/social';
import { cn } from '@/lib/utils';
import { openMemberProfile, useMemberLookup } from '@/store/useMembersStore';
import { usePrimaryColor } from '@/store/useSettingsStore';

/** 댓글 시각: 오늘이면 시:분, 아니면 월/일 */
function commentTime(at: string) {
  const d = dayjs(at);
  return d.isSame(dayjs(), 'day') ? d.format('A h:mm') : d.format('M월 D일');
}

/**
 * 공간 항목의 이모지 반응과 댓글.
 * 반응: 웃는 얼굴(+)에서 골라 남기고, 남겨진 반응을 누르면 내 반응을 남기거나 뺀다.
 * 길게 누르면 누가 남겼는지 보인다.
 * 댓글은 아래 입력칸에서 남긴다. 내 댓글은 오른쪽 ⋯(또는 길게 누르기)로 고치거나 지운다 (고친 댓글은 '(수정됨)').
 * 다른 사람 댓글은 길게 눌러 신고·차단한다. 댓글을 길게 누르면 이모지 반응도 남길 수 있다.
 */
export function ItemSocial({
  itemId,
  spaceId,
  onInputFocus,
}: {
  itemId: string;
  spaceId: string;
  /** 입력칸을 누르면 화면을 아래로 내려 키보드에 가리지 않게 */
  onInputFocus?: () => void;
}) {
  const social = useItemSocial(itemId, spaceId);
  const member = useMemberLookup(spaceId);
  const primary = usePrimaryColor();
  const { colorScheme } = useThemeMode();
  const theme = themeColors[colorScheme];
  const [pickerOpen, setPickerOpen] = useState(false);
  /** 누가 눌렀는지 보고 있는 반응 */
  const [whoFor, setWhoFor] = useState<ReactionEmoji | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  /** 고치는 중인 내 댓글 (입력칸이 그 댓글로 채워진다) */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** 메뉴를 연 댓글 (내 것: 고치기·지우기, 다른 사람 것: 신고·차단) */
  const [menuFor, setMenuFor] = useState<ItemCommentRow | null>(null);
  const inputRef = useRef<TextInputInstance>(null);

  if (social.state.status === 'error' && !social.data) {
    return (
      <InlineError
        message="댓글과 반응을 불러오지 못했어요"
        onRetry={social.reload}
      />
    );
  }
  if (!social.data) {
    return (
      <View className="items-center py-6">
        <ActivityIndicator />
      </View>
    );
  }

  const { comments, reactions, commentReactions } = social.data;
  /** 댓글 하나에 남겨진 반응 (이모지별 개수, 내가 눌렀는지) */
  const reactionsOf = (commentId: string) =>
    REACTION_EMOJIS.map((emoji) => {
      const list = commentReactions.filter(
        (r) => r.comment_id === commentId && r.emoji === emoji
      );
      return {
        emoji,
        count: list.length,
        mine: list.some((r) => r.user_id === social.userId),
      };
    }).filter((c) => c.count > 0);
  const toggleOnComment = (commentId: string, emoji: ReactionEmoji) => {
    setMenuFor(null);
    social
      .toggleCommentReaction(commentId, emoji)
      .catch((e) => showErrorAlert('반응을 남기지 못했어요', e));
  };
  // 반응별 개수와 내가 눌렀는지
  const counts = REACTION_EMOJIS.map((emoji) => {
    const list = reactions.filter((r) => r.emoji === emoji);
    return {
      emoji,
      count: list.length,
      mine: list.some((r) => r.user_id === social.userId),
    };
  });
  const used = counts.filter((c) => c.count > 0);

  const toggle = (emoji: ReactionEmoji) => {
    setPickerOpen(false);
    setWhoFor(null);
    social
      .toggleReaction(emoji)
      .catch((e) => showErrorAlert('반응을 남기지 못했어요', e));
  };

  const send = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      if (editingId) {
        await social.editComment(editingId, draft);
        setEditingId(null);
      } else {
        await social.sendComment(draft);
      }
      setDraft('');
    } catch (e) {
      // 쓴 글은 그대로 두고 다시 보낼 수 있게
      showErrorAlert(
        editingId ? '댓글을 고치지 못했어요' : '댓글을 남기지 못했어요',
        e,
        send
      );
    } finally {
      setSending(false);
    }
  };

  const startEdit = (id: string) => {
    const target = comments.find((c) => c.id === id);
    if (!target) return;
    setEditingId(id);
    setDraft(target.body);
    // 메뉴가 닫힌 뒤에 입력칸을 연다
    setTimeout(() => inputRef.current?.focus(), 250);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };

  const confirmDelete = (id: string) =>
    showAlert('댓글을 지울까요?', undefined, [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () =>
          social
            .removeComment(id)
            .catch((e) => showErrorAlert('댓글을 지우지 못했어요', e)),
      },
    ]);

  return (
    <View className="gap-4">
      {/* 이모지 반응 */}
      <View className="gap-2">
        <View className="flex-row flex-wrap items-center gap-2">
          {used.map((c) => (
            <Pressable
              key={c.emoji}
              accessibilityRole="button"
              accessibilityLabel={`${c.emoji} ${c.count}명${c.mine ? ', 내가 누름' : ''}`}
              accessibilityHint="누르면 남기거나 빼고, 길게 누르면 누가 남겼는지 보여요"
              // 짧게: 내 반응 남기기·빼기, 길게: 누가 남겼는지
              onPress={() => toggle(c.emoji)}
              onLongPress={() => setWhoFor(c.emoji)}
              delayLongPress={350}
              className={cn(
                'h-9 flex-row items-center gap-1 rounded-full border px-3 active:opacity-70',
                c.mine ? 'border-primary' : 'border-border bg-card'
              )}
              style={c.mine ? { backgroundColor: `${primary}1F` } : undefined}
            >
              <Text size={15}>{c.emoji}</Text>
              <Text
                weight="600"
                size={13}
                className={c.mine ? 'text-primary' : 'text-muted-foreground'}
              >
                {c.count}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="반응 남기기"
            onPress={() => setPickerOpen((v) => !v)}
            className="h-9 w-11 items-center justify-center rounded-full bg-accent active:opacity-70"
          >
            <Icon as={SmilePlus} size={18} className="text-muted-foreground" />
          </Pressable>
        </View>
        {pickerOpen ? (
          <View className="flex-row justify-between rounded-2xl px-3 py-2 bg-accent">
            {counts.map((c) => (
              <Pressable
                key={c.emoji}
                accessibilityRole="button"
                accessibilityLabel={`${c.emoji} ${c.mine ? '빼기' : '남기기'}`}
                onPress={() => toggle(c.emoji)}
                className={cn(
                  'h-11 w-11 items-center justify-center rounded-full active:opacity-70',
                  c.mine && 'bg-background'
                )}
              >
                <Text size={24}>{c.emoji}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <ActionSheet
        visible={whoFor !== null}
        onClose={() => setWhoFor(null)}
        header={
          whoFor ? (
            <View className="gap-4">
              <View className="flex-row items-center gap-2">
                <Text size={28}>{whoFor}</Text>
                <Text weight="700" size={17}>
                  {reactions.filter((r) => r.emoji === whoFor).length}명이
                  남겼어요
                </Text>
              </View>
              <View className="gap-3">
                {reactions
                  .filter((r) => r.emoji === whoFor)
                  // 나를 맨 위에, 나머지는 남긴 순서대로
                  .sort((a, b) =>
                    a.user_id === social.userId
                      ? -1
                      : b.user_id === social.userId
                        ? 1
                        : a.created_at.localeCompare(b.created_at)
                  )
                  .map((r) => {
                    const who = member(r.user_id);
                    return (
                      <View
                        key={r.user_id}
                        className="flex-row items-center gap-3"
                      >
                        <PersonAvatar imagePath={who.avatarPath} size={32} />
                        <Text size={15} numberOfLines={1} className="flex-1">
                          {who.name}
                        </Text>
                      </View>
                    );
                  })}
              </View>
            </View>
          ) : null
        }
        // 보기만 한다 (남기기·빼기는 반응을 짧게 눌러서)
        items={[]}
      />

      {/* 댓글 */}
      <View className="gap-3">
        <Text weight="700" size={18}>
          댓글{comments.length > 0 ? ` ${comments.length}` : ''}
        </Text>
        {comments.length === 0 ? (
          <Text variant="muted" size={13}>
            첫 댓글을 남겨봐요. &quot;여기 꼭 가자!&quot; 같은 한마디도 좋아요.
          </Text>
        ) : (
          comments.map((c) => {
            const who = member(c.user_id);
            const mine = c.user_id === social.userId;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityHint={
                  mine
                    ? '길게 눌러 반응을 남기거나, 고치거나 지우기'
                    : '길게 눌러 반응을 남기거나, 신고·차단하기'
                }
                onLongPress={() => setMenuFor(c)}
                delayLongPress={350}
                className="flex-row gap-2.5"
              >
                {/* 사진을 누르면 그 사람 프로필 */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${who.name} 프로필 보기`}
                  hitSlop={4}
                  onPress={() => openMemberProfile(c.user_id, mine)}
                  className="active:opacity-70"
                >
                  <PersonAvatar imagePath={who.avatarPath} size={28} />
                </Pressable>
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <Text weight="600" size={13}>
                      {who.name}
                    </Text>
                    <Text variant="muted" size={11}>
                      {commentTime(c.created_at)}
                      {c.edited_at ? ' (수정됨)' : ''}
                    </Text>
                  </View>
                  <View
                    className={cn(
                      'self-start rounded-2xl rounded-tl-md px-3 py-2',
                      mine ? '' : 'bg-accent'
                    )}
                    style={
                      mine ? { backgroundColor: `${primary}1F` } : undefined
                    }
                  >
                    <Text size={14}>{c.body}</Text>
                  </View>
                  {/* 댓글에 남긴 반응 (누르면 내 반응을 남기거나 뺀다) */}
                  {reactionsOf(c.id).length > 0 ? (
                    <View className="flex-row flex-wrap gap-1.5">
                      {reactionsOf(c.id).map((rc) => (
                        <Pressable
                          key={rc.emoji}
                          accessibilityRole="button"
                          accessibilityLabel={`${rc.emoji} ${rc.count}명${rc.mine ? ', 내가 누름' : ''}`}
                          onPress={() => toggleOnComment(c.id, rc.emoji)}
                          className={cn(
                            'h-7 flex-row items-center gap-1 rounded-full border px-2 active:opacity-70',
                            rc.mine ? 'border-primary' : 'border-border bg-card'
                          )}
                          style={
                            rc.mine
                              ? { backgroundColor: `${primary}1F` }
                              : undefined
                          }
                        >
                          <Text size={12}>{rc.emoji}</Text>
                          <Text
                            weight="600"
                            size={11}
                            className={
                              rc.mine ? 'text-primary' : 'text-muted-foreground'
                            }
                          >
                            {rc.count}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
                {/* 내 댓글: 고치기·지우기 메뉴 */}
                {mine ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="댓글 메뉴"
                    hitSlop={10}
                    onPress={() => setMenuFor(c)}
                    className="h-7 w-7 items-center justify-center self-start active:opacity-60"
                  >
                    <Icon
                      as={Ellipsis}
                      size={18}
                      className="text-muted-foreground"
                    />
                  </Pressable>
                ) : null}
              </Pressable>
            );
          })
        )}
        {comments.length > 0 ? (
          <Text variant="muted" size={11}>
            {comments.some((c) => c.user_id !== social.userId)
              ? '댓글을 길게 눌러 반응을 남기거나, 신고·차단할 수 있어요'
              : '댓글을 길게 눌러 반응을 남길 수 있어요'}
          </Text>
        ) : null}

        {/* 고치는 중이면 입력칸 위에 안내와 취소 */}
        {editingId ? (
          <View className="flex-row items-center justify-between px-1">
            <Text size={12} className="text-primary" weight="600">
              댓글 고치는 중
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={cancelEdit}
              hitSlop={8}
              className="active:opacity-60"
            >
              <Text size={12} weight="600" className="text-muted-foreground">
                취소
              </Text>
            </Pressable>
          </View>
        ) : null}
        {/* 댓글 메뉴: 내 것은 고치기·지우기, 다른 사람 것은 신고·차단 */}
        <ActionSheet
          visible={menuFor !== null}
          onClose={() => setMenuFor(null)}
          header={
            menuFor ? (
              <View className="gap-3">
                {menuFor.user_id !== social.userId ? (
                  <Text size={14} numberOfLines={3}>
                    {member(menuFor.user_id).name}: {menuFor.body}
                  </Text>
                ) : null}
                {/* 이 댓글에 반응 남기기 */}
                <View className="flex-row justify-between rounded-2xl px-2 py-1.5 bg-accent">
                  {REACTION_EMOJIS.map((emoji) => {
                    const mine = commentReactions.some(
                      (r) =>
                        r.comment_id === menuFor.id &&
                        r.user_id === social.userId &&
                        r.emoji === emoji
                    );
                    return (
                      <Pressable
                        key={emoji}
                        accessibilityRole="button"
                        accessibilityLabel={`댓글에 ${emoji} ${mine ? '빼기' : '남기기'}`}
                        onPress={() => toggleOnComment(menuFor.id, emoji)}
                        className={cn(
                          'h-11 w-11 items-center justify-center rounded-full active:opacity-70',
                          mine && 'bg-background'
                        )}
                      >
                        <Text size={24}>{emoji}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null
          }
          items={
            !menuFor
              ? []
              : menuFor.user_id === social.userId
                ? [
                    {
                      label: '고치기',
                      onPress: () => startEdit(menuFor.id),
                    },
                    {
                      label: '지우기',
                      destructive: true,
                      onPress: () => confirmDelete(menuFor.id),
                    },
                  ]
                : [
                    {
                      label: '댓글 신고하기',
                      onPress: () =>
                        askReport({
                          spaceId,
                          targetUserId: menuFor.user_id,
                          name: member(menuFor.user_id).name,
                          comment: { id: menuFor.id, body: menuFor.body },
                          onBlocked: social.reload,
                        }),
                    },
                    {
                      label: `${member(menuFor.user_id).name}님 차단하기`,
                      destructive: true,
                      onPress: () =>
                        askBlock(
                          menuFor.user_id,
                          member(menuFor.user_id).name,
                          social.reload
                        ),
                    },
                  ]
          }
        />

        {/* 입력칸 */}
        <View
          className={cn(
            'flex-row items-end gap-2 rounded-2xl border bg-card px-3 py-1.5',
            editingId ? 'border-primary' : 'border-border'
          )}
        >
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder="댓글 달기"
            placeholderTextColor={theme.mutedForeground}
            maxLength={MAX_COMMENT_LENGTH}
            multiline
            onFocus={onInputFocus}
            className="max-h-28 flex-1 py-2 text-foreground"
            style={{ fontFamily: FONT_WEIGHTS['400'], fontSize: 15 }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editingId ? '고친 댓글 저장' : '댓글 보내기'}
            disabled={!draft.trim() || sending}
            onPress={() => void send()}
            className="h-10 w-10 items-center justify-center active:opacity-60"
          >
            {sending ? (
              <ActivityIndicator size="small" />
            ) : (
              <Icon
                as={editingId ? Check : SendHorizontal}
                size={20}
                className={draft.trim() ? 'text-primary' : 'text-muted'}
              />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
