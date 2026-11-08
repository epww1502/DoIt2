import { useState, type Dispatch, type SetStateAction } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Text } from '@/components/atoms';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { LinkCard } from '@/components/bucket/LinkCard';
import { colors } from '@/constants/colors';
import { FONT_WEIGHTS } from '@/constants/fonts';
import { normalizeUrl } from '@/lib/bucket/link';
import { MAX_LINKS, type ItemLink } from '@/lib/bucket/types';
import { showAlert } from '@/lib/dialog';
import { fetchLinkPreview } from '@/lib/linkPreview';
import { cn } from '@/lib/utils';

type LinksFieldProps = {
  links: ItemLink[];
  setLinks: Dispatch<SetStateAction<ItemLink[]>>;
  onFocus?: () => void;
};

/**
 * 담기·수정 화면의 '링크' 칸. 주소를 붙여넣고 '추가'를 누르면
 * 바로 목록에 들어가고, 제목·사진은 뒤에서 받아 와 채운다.
 */
export function LinksField({ links, setLinks, onFocus }: LinksFieldProps) {
  const [text, setText] = useState('');
  // 제목·사진을 받아 오는 중인 링크
  const [loading, setLoading] = useState<string[]>([]);
  const full = links.length >= MAX_LINKS;
  const hasText = text.trim().length > 0;

  const add = () => {
    const url = normalizeUrl(text);
    if (!url) {
      showAlert(
        '링크 주소가 아니에요',
        'https://로 시작하는 주소를 붙여넣어 주세요'
      );
      return;
    }
    setText('');
    if (links.some((l) => l.url === url)) return;
    setLinks((prev) => [...prev, { url }]);
    setLoading((prev) => [...prev, url]);
    void fetchLinkPreview(url)
      .then((preview) =>
        setLinks((prev) =>
          prev.map((l) => (l.url === url ? { ...l, ...preview } : l))
        )
      )
      .catch(() => {})
      .finally(() => setLoading((prev) => prev.filter((u) => u !== url)));
  };

  const remove = (url: string) =>
    setLinks((prev) => prev.filter((l) => l.url !== url));

  return (
    <View>
      <FieldLabel>링크 (선택)</FieldLabel>
      <View className="gap-1.5">
        {links.map((link) => (
          <LinkCard
            key={link.url}
            link={link}
            loading={loading.includes(link.url)}
            onRemove={() => remove(link.url)}
          />
        ))}
        {full ? null : (
          <View className="h-11 flex-row items-center gap-2 rounded-xl pl-3.5 pr-1.5 bg-accent">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="블로그, 인스타, 영상 주소 붙여넣기"
              placeholderTextColor={colors.gray[400]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (hasText) add();
              }}
              onFocus={onFocus}
              className="flex-1 text-foreground"
              style={{
                fontFamily: FONT_WEIGHTS['500'],
                fontSize: 15,
                paddingVertical: 0,
              }}
            />
            <Pressable
              accessibilityRole="button"
              disabled={!hasText}
              onPress={add}
              className={cn(
                'h-8 justify-center rounded-lg bg-primary px-3 active:opacity-70',
                !hasText && 'opacity-40'
              )}
            >
              <Text weight="600" size={13} className="text-primary-foreground">
                추가
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
