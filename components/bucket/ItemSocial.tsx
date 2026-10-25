import dayjs from 'dayjs';
import { SendHorizontal, SmilePlus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { ActionSheet, Icon, InlineError, Text } from '@/components/atoms';
import { PersonAvatar } from '@/components/space/PersonAvatar';
import { useItemSocial } from '@/hooks/useItemSocial';
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
import { useMemberLookup } from '@/store/useMembersStore';
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
 * 댓글은 아래 입력칸에서 남긴다. 내 댓글은 길게 눌러 지운다.
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

  const { comments, reactions } = social.data;
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
      await social.sendComment(draft);
      setDraft('');
    } catch (e) {
      // 쓴 글은 그대로 두고 다시 보낼 수 있게
      showErrorAlert('댓글을 남기지 못했어요', e, send);
    } finally {
      setSending(false);
    }
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
                c.mine ? 'border-primary' : 'bg-card border-border'
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
                accessibilityRole={mine ? 'button' : undefined}
                accessibilityHint={mine ? '길게 눌러 지우기' : undefined}
                onLongPress={mine ? () => confirmDelete(c.id) : undefined}
                delayLongPress={350}
                className="flex-row gap-2.5"
              >
                <PersonAvatar imagePath={who.avatarPath} size={28} />
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <Text weight="600" size={13}>
                      {who.name}
                    </Text>
                    <Text variant="muted" size={11}>
                      {commentTime(c.created_at)}
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
                </View>
              </Pressable>
            );
          })
        )}
        {comments.some((c) => c.user_id === social.userId) ? (
          <Text variant="muted" size={11}>
            내 댓글은 길게 눌러 지울 수 있어요
          </Text>
        ) : null}

        {/* 입력칸 */}
        <View className="flex-row items-end gap-2 rounded-2xl border px-3 py-1.5 bg-card border-border">
          <TextInput
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
            accessibilityLabel="댓글 보내기"
            disabled={!draft.trim() || sending}
            onPress={() => void send()}
            className="h-10 w-10 items-center justify-center active:opacity-60"
          >
            {sending ? (
              <ActivityIndicator size="small" />
            ) : (
              <Icon
                as={SendHorizontal}
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
