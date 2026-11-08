import { Image } from 'expo-image';
import { Link as LinkIcon, X } from 'lucide-react-native';
import { Linking, Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { showAlert } from '@/lib/dialog';
import { linkHost, linkLabel } from '@/lib/bucket/link';
import type { ItemLink } from '@/lib/bucket/types';

/** 링크 열기 (인스타·유튜브 링크는 그 앱이 있으면 그 앱으로) */
export function openLink(url: string) {
  Linking.openURL(url).catch(() =>
    showAlert('링크를 열 수 없어요', linkHost(url))
  );
}

/**
 * 링크 한 줄: 미리보기 사진 + 제목 + 사이트. 누르면 연다.
 * onRemove가 있으면(담기·수정 화면) 오른쪽에 빼기 버튼.
 */
export function LinkCard({
  link,
  loading = false,
  onRemove,
}: {
  link: ItemLink;
  /** 제목·사진을 받아 오는 중 */
  loading?: boolean;
  onRemove?: () => void;
}) {
  const host = linkHost(link.url);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${linkLabel(link)} 링크 열기`}
      onPress={() => openLink(link.url)}
      className="flex-row items-center gap-3 rounded-2xl p-2.5 bg-accent active:opacity-70"
    >
      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-card">
        {link.image ? (
          <Image
            source={{ uri: link.image }}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
            transition={150}
            recyclingKey={link.image}
          />
        ) : (
          <Icon as={LinkIcon} size={20} className="text-primary" />
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={14} numberOfLines={2}>
          {loading && !link.title ? '불러오는 중…' : linkLabel(link)}
        </Text>
        <Text variant="muted" size={12} numberOfLines={1}>
          {link.site && link.site !== host ? `${link.site} · ${host}` : host}
        </Text>
      </View>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="링크 빼기"
          hitSlop={8}
          onPress={onRemove}
          className="h-8 w-8 items-center justify-center rounded-full active:opacity-60"
        >
          <Icon as={X} size={16} className="text-muted-foreground" />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
