import dayjs from 'dayjs';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  ErrorState,
  Icon,
  NavBar,
  Segmented,
  Text,
} from '@/components/atoms';
import { type AdminControls, AdminGate } from '@/components/admin/AdminGate';
import { SpaceAvatar } from '@/components/space/SpaceAvatar';
import { useLoad } from '@/hooks/useLoad';
import {
  type AdminSpace,
  type AdminUser,
  fetchAdminDashboard,
} from '@/lib/admin';

type Tab = 'spaces' | 'users';

/** '3일 전', '방금' 같은 말로 (없으면 '기록 없음') */
function ago(iso: string | null) {
  if (!iso) return '기록 없음';
  const minutes = dayjs().diff(dayjs(iso), 'minute');
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / (60 * 24))}일 전`;
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <View className="min-w-[45%] flex-1 gap-0.5 rounded-2xl px-4 py-3 bg-accent">
      <Text size={12} className="text-muted-foreground">
        {label}
      </Text>
      <Text weight="700" size={22}>
        {value.toLocaleString()}
      </Text>
      {detail ? (
        <Text size={12} className="text-muted-foreground">
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

function SpaceRow({ space }: { space: AdminSpace }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent">
      <SpaceAvatar emoji={space.emoji} size={36} />
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={15} numberOfLines={1}>
          {space.name}
        </Text>
        <Text size={12} className="text-muted-foreground">
          {`${space.personal ? '개인 공간' : `${space.members}명`} · 항목 ${space.items} · 기록 ${space.records}`}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text size={12} className="text-muted-foreground">
          {ago(space.last_activity)}
        </Text>
        <Text size={11} className="text-muted-foreground">
          {`${dayjs(space.created_at).format('M/D')} 만듦`}
        </Text>
      </View>
    </View>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent">
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={15} numberOfLines={1}>
          {user.nickname?.trim() || `이름 없음 · ${user.id.slice(0, 4)}`}
        </Text>
        <Text size={12} className="text-muted-foreground">
          {`공간 ${user.spaces} · 담은 것 ${user.items}${user.app ? ` · ${user.app}` : ''}`}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text size={12} className="text-muted-foreground">
          {ago(user.last_used)}
        </Text>
        <Text size={11} className="text-muted-foreground">
          {`${dayjs(user.joined).format('M/D')} 가입`}
        </Text>
      </View>
    </View>
  );
}

/**
 * 관리자 모드: 사용자·공간 현황과 받은 문의. 관리자 계정에만 설정에 줄이 보인다.
 * 숫자와 이름·날짜만 본다 (담은 내용, 기록, 사진은 보지 않는다). 관리자가 아니면 서버가 거절해서 오류 화면이 뜬다.
 */
export default function AdminScreen() {
  return (
    <AdminGate title="관리자 모드">
      {(controls) => <AdminHome controls={controls} />}
    </AdminGate>
  );
}

function AdminHome({ controls }: { controls: AdminControls }) {
  const { state } = useLoad(fetchAdminDashboard, []);
  const [tab, setTab] = useState<Tab>('spaces');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="관리자 모드" />
      {state.status === 'loading' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : state.status === 'error' ? (
        // 열어 둔 15분이 지났으면 서버가 거절한다. 다시 확인해서 PIN을 묻는다
        <ErrorState title="불러오지 못했어요" onRetry={controls.recheck} />
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-2">
          <View className="flex-row flex-wrap gap-2">
            <Stat
              label="사용자"
              value={state.data.overview.users}
              detail={`최근 7일 새로 ${state.data.overview.new_users_7d} · 사용 ${state.data.overview.active_users_7d}`}
            />
            <Stat
              label="공간"
              value={state.data.overview.spaces}
              detail={`같이 쓰는 곳 ${state.data.overview.shared_spaces}`}
            />
            <Stat label="담은 항목" value={state.data.overview.items} />
            <Stat label="기록" value={state.data.overview.records} />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/inquiries')}
            className="flex-row items-center gap-3 rounded-2xl border border-primary/30 px-4 py-3 bg-accent active:opacity-70"
          >
            <View className="flex-1 gap-0.5">
              <Text weight="600" size={15}>
                받은 문의
              </Text>
              <Text size={12} className="text-muted-foreground">
                {state.data.overview.open_inquiries > 0
                  ? `아직 확인하지 않은 문의 ${state.data.overview.open_inquiries}건`
                  : '확인하지 않은 문의가 없어요'}
              </Text>
            </View>
            <Icon
              as={ChevronRight}
              size={18}
              className="text-muted-foreground"
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/admin-logs')}
            className="flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent active:opacity-70"
          >
            <View className="flex-1 gap-0.5">
              <Text weight="600" size={15}>
                로그
              </Text>
              <Text size={12} className="text-muted-foreground">
                앱 오류, 많이 쓴 기능, AI 호출
              </Text>
            </View>
            <Icon
              as={ChevronRight}
              size={18}
              className="text-muted-foreground"
            />
          </Pressable>

          <Segmented<Tab>
            options={[
              { value: 'spaces', label: `공간 ${state.data.spaces.length}` },
              { value: 'users', label: `사용자 ${state.data.users.length}` },
            ]}
            value={tab}
            onChange={setTab}
          />
          <View className="gap-2">
            <Text size={12} className="text-muted-foreground">
              {tab === 'spaces'
                ? '최근에 항목이 바뀐 공간부터'
                : '최근에 쓴 사람부터'}
            </Text>
            {tab === 'spaces'
              ? state.data.spaces.map((space) => (
                  <SpaceRow key={space.id} space={space} />
                ))
              : state.data.users.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
          </View>

          <View className="gap-1 pt-2">
            <Button
              label="지금 잠그기"
              variant="outline"
              size="md"
              onPress={controls.lock}
            />
            <Button
              label="PIN 바꾸기"
              variant="ghost"
              size="md"
              onPress={controls.changePin}
            />
            {controls.biometric ? (
              <Button
                label={`${controls.biometric.label}로 열기 ${controls.biometric.enabled ? '끄기' : '켜기'}`}
                variant="ghost"
                size="md"
                onPress={controls.biometric.toggle}
              />
            ) : null}
            <Text size={12} className="text-center text-muted-foreground">
              열어 두면 15분 뒤에 저절로 잠겨요
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
