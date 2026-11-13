import { router } from 'expo-router';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Plus,
  ListOrdered,
  Settings2,
  Ticket,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, InlineError, Text } from '@/components/atoms';
import { cn } from '@/lib/utils';
import { SpaceAvatar } from './SpaceAvatar';
import { SpaceMemberList, SpaceMemberPreview } from './SpaceMemberPreview';
import { useBucketStore } from '@/store/useBucketStore';
import { useSpace, useSpaceStore, type Space } from '@/store/useSpaceStore';
import { SheetPanel } from '@/components/atoms/SheetPanel';

/** '나만 보기'(공간 없음)를 보여줄 때 쓰는 모양 */
export const PERSONAL = { emoji: '📱', name: '나만 보기' };

/** 탭 화면 제목 오른쪽: 지금 공간 이름. 누르면 공간을 바꾸는 시트가 열린다 */
export function SpaceSwitcher() {
  const spaceId = useBucketStore((s) => s.spaceId);
  const space = useSpace(spaceId);
  const [open, setOpen] = useState(false);
  const current = space ?? PERSONAL;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`지금 공간: ${current.name}. 눌러서 바꾸기`}
        onPress={() => setOpen(true)}
        className="max-w-[140px] flex-row items-center gap-1 rounded-full px-3 py-2 bg-accent active:opacity-70"
      >
        <SpaceAvatar
          emoji={current.emoji}
          imagePath={space?.image_path}
          size={22}
        />
        <Text weight="600" size={13} numberOfLines={1} className="shrink">
          {current.name}
        </Text>
        <Icon as={ChevronDown} size={14} className="text-muted-foreground" />
      </Pressable>
      <SpaceSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SpaceSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const status = useSpaceStore((s) => s.status);
  const spaces = useSpaceStore((s) => s.spaces);
  const spaceId = useBucketStore((s) => s.spaceId);
  const online = status === 'ready';
  // 멤버 목록을 보고 있는 공간 (시트 안에서 화면만 바꾼다)
  const [membersOf, setMembersOf] = useState<Space | null>(null);

  const close = () => {
    setMembersOf(null);
    onClose();
  };

  const choose = (id: string | null) => {
    close();
    void useBucketStore
      .getState()
      .switchSpace(id)
      .catch(() => {});
  };

  const go = (
    path: '/space/new' | '/space/join' | '/space' | '/space/list'
  ) => {
    close();
    router.push(path);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => (membersOf ? setMembersOf(null) : close())}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={close}
          className="absolute inset-0 bg-black/40"
        />
        <SheetPanel onClose={close} handleOnly style={{ maxHeight: '75%' }}>
          {membersOf ? (
            <View
              className="shrink gap-3 rounded-t-3xl bg-background pt-5"
              style={{ paddingBottom: insets.bottom + 12 }}
            >
              <View className="flex-row items-center gap-1 px-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="공간 목록으로"
                  hitSlop={8}
                  onPress={() => setMembersOf(null)}
                  className="p-1 active:opacity-60"
                >
                  <Icon as={ChevronLeft} size={24} />
                </Pressable>
                <Text
                  weight="700"
                  size={18}
                  numberOfLines={1}
                  className="shrink"
                >
                  {`${membersOf.name} 멤버 ${membersOf.memberCount}명`}
                </Text>
              </View>
              <SpaceMemberList
                spaceId={membersOf.id}
                memberCount={membersOf.memberCount}
              />
            </View>
          ) : (
            <View
              className="shrink gap-3 rounded-t-3xl bg-background pt-5"
              style={{ paddingBottom: insets.bottom + 12 }}
            >
              <Text weight="700" size={18} className="px-5">
                어느 공간을 볼까요?
              </Text>
              <ScrollView contentContainerClassName="gap-1 px-3">
                <SpaceRow
                  emoji={PERSONAL.emoji}
                  name={PERSONAL.name}
                  detail="이 휴대폰에만 저장돼요"
                  selected={spaceId === null}
                  onPress={() => choose(null)}
                />
                {spaces.map((s: Space) => (
                  <SpaceRow
                    key={s.id}
                    emoji={s.emoji}
                    imagePath={s.image_path}
                    name={s.name}
                    detail={
                      s.is_personal || s.memberCount <= 1 ? (
                        s.is_personal ? (
                          '개인 공간'
                        ) : (
                          '아직 나만 있어요'
                        )
                      ) : (
                        <SpaceMemberPreview
                          spaceId={s.id}
                          memberCount={s.memberCount}
                          onPress={() => setMembersOf(s)}
                        />
                      )
                    }
                    selected={spaceId === s.id}
                    onPress={() => choose(s.id)}
                  />
                ))}
              </ScrollView>

              <View className="gap-1 border-t border-border px-3 pt-2">
                {online ? (
                  <>
                    <ActionRow
                      icon={Plus}
                      label="새 공간 만들기"
                      onPress={() => go('/space/new')}
                    />
                    <ActionRow
                      icon={Ticket}
                      label="초대 코드로 들어가기"
                      onPress={() => go('/space/join')}
                    />
                    {spaceId ? (
                      <ActionRow
                        icon={Settings2}
                        label="지금 공간 관리 · 초대하기"
                        onPress={() => go('/space')}
                      />
                    ) : null}
                    {spaces.length > 1 ? (
                      <ActionRow
                        icon={ListOrdered}
                        label="모든 공간 관리 · 순서 바꾸기"
                        onPress={() => go('/space/list')}
                      />
                    ) : null}
                  </>
                ) : status === 'loading' ? (
                  <Text variant="muted" size={13} className="px-2 py-2">
                    서버에 연결하는 중이에요…
                  </Text>
                ) : (
                  // 연결에 실패했으면 여기서 바로 다시 시도한다
                  <InlineError
                    message="서버에 연결해야 공간을 만들거나 들어갈 수 있어요."
                    onRetry={() => void useSpaceStore.getState().init()}
                  />
                )}
              </View>
            </View>
          )}
        </SheetPanel>
      </View>
    </Modal>
  );
}

function SpaceRow({
  emoji,
  imagePath,
  name,
  detail,
  selected,
  onPress,
}: {
  emoji: string;
  imagePath?: string | null;
  name: string;
  detail: ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 rounded-2xl px-3 py-3 active:opacity-70',
        selected && 'bg-accent'
      )}
    >
      <SpaceAvatar emoji={emoji} imagePath={imagePath} size={44} />
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={16} numberOfLines={1}>
          {name}
        </Text>
        {typeof detail === 'string' ? (
          <Text variant="muted" size={12}>
            {detail}
          </Text>
        ) : (
          detail
        )}
      </View>
      {selected ? <Icon as={Check} size={20} className="text-primary" /> : null}
    </Pressable>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
}: {
  icon: typeof Plus;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl px-3 py-3 active:opacity-70"
    >
      <Icon as={icon} size={20} className="text-primary" />
      <Text weight="600" size={15} className="text-primary">
        {label}
      </Text>
    </Pressable>
  );
}
