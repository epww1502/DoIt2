import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Card,
  CardContent,
  ErrorState,
  NavBar,
  ProgressBar,
  Text,
} from '@/components/atoms';
import { useLoad } from '@/hooks/useLoad';
import { fetchAiUsage } from '@/lib/ai';
import type { AiQuota } from '@/lib/bucket/aiDraft';

/** 설정 > AI 사용량: 오늘 쓴 횟수와 남은 횟수 */
export default function AiUsageScreen() {
  const { state, reload } = useLoad(fetchAiUsage, []);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="AI 사용량" />
      {state.status === 'loading' ? (
        <View className="items-center gap-3 py-10">
          <ActivityIndicator />
          <Text variant="muted">불러오는 중이에요</Text>
        </View>
      ) : state.status === 'error' ? (
        <ErrorState error={state.error} onRetry={reload} />
      ) : (
        <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-2">
          <QuotaCard
            title="오늘 쓸 수 있는 AI"
            description="버튼을 눌러서 쓸 때마다 한 번씩 들어가요"
            quota={state.data.ai}
          />
          <Text variant="muted" size={12} className="px-1">
            횟수는 매일 밤 12시(한국 시간)에 다시 채워져요. 다 쓰면 AI 버튼을
            눌렀을 때 내일 다시 쓸 수 있다고 알려드리고, 직접 적어서 담는 건
            그대로 할 수 있어요.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function QuotaCard({
  title,
  description,
  quota,
}: {
  title: string;
  description: string;
  quota: AiQuota;
}) {
  const left = quota.limit - quota.used;
  return (
    <Card className="rounded-2xl">
      <CardContent className="gap-3 p-5">
        <View className="gap-0.5">
          <Text weight="600" size={16}>
            {title}
          </Text>
          <Text variant="muted" size={12}>
            {description}
          </Text>
        </View>
        <View
          accessible
          accessibilityLabel={`오늘 ${left}번 남았어요. ${quota.limit}번 중 ${quota.used}번 썼어요`}
          className="gap-2"
        >
          <View className="flex-row items-baseline justify-between">
            <Text weight="700" size={22}>
              {left}번 남았어요
            </Text>
            <Text variant="muted" size={13}>
              {quota.used} / {quota.limit}번 씀
            </Text>
          </View>
          <ProgressBar
            value={quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0}
          />
        </View>
      </CardContent>
    </Card>
  );
}
