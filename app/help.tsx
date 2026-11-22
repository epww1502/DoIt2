import { type Href, router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, NavBar, Text } from '@/components/atoms';
import {
  FAQ_GROUPS,
  FAQ_TAB_HREFS,
  type FaqItem,
  type FaqStep,
} from '@/lib/faq';
import { trackStep } from '@/lib/steps';
import { cn } from '@/lib/utils';

/** 단계를 눌렀을 때: 탭 화면이면 도움말을 닫고 그 탭으로, 아니면 그 화면을 위에 연다 */
function go(href: Href) {
  if (FAQ_TAB_HREFS.includes(href)) router.navigate(href);
  else router.push(href);
}

/** 가는 길 한 줄: [설정] › [내 프로필] › [계정 코드]. 색이 들어간 칸은 눌러서 바로 갈 수 있다 */
function StepPath({ itemId, steps }: { itemId: string; steps: FaqStep[] }) {
  return (
    <View className="flex-row flex-wrap items-center gap-1.5">
      {steps.map((step, index) => (
        <Fragment key={`${index}-${step.label}`}>
          {index > 0 ? (
            <Icon
              as={ChevronRight}
              size={14}
              className="text-muted-foreground"
            />
          ) : null}
          {step.href ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${step.label} 화면으로 가기`}
              hitSlop={4}
              onPress={() => {
                trackStep('faq_step', `${itemId}:${String(step.href)}`);
                go(step.href!);
              }}
              className="rounded-full border border-primary/40 px-3 py-1.5 bg-accent active:opacity-60"
            >
              <Text weight="600" size={13} className="text-primary">
                {step.label}
              </Text>
            </Pressable>
          ) : (
            <View className="rounded-full border border-border px-3 py-1.5">
              <Text size={13} className="text-muted-foreground">
                {step.label}
              </Text>
            </View>
          )}
        </Fragment>
      ))}
    </View>
  );
}

function Question({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="rounded-2xl bg-accent">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        className="min-h-[52px] flex-row items-center gap-3 px-4 py-3 active:opacity-70"
      >
        <Text weight="600" size={15} className="flex-1">
          {item.question}
        </Text>
        <Icon
          as={open ? ChevronUp : ChevronDown}
          size={18}
          className="text-muted-foreground"
        />
      </Pressable>
      {open ? (
        <View className="gap-3 px-4 pb-4">
          <Text size={14} className="leading-6 text-foreground">
            {item.answer}
          </Text>
          {item.paths?.map((steps, index) => (
            <StepPath key={index} itemId={item.id} steps={steps} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** 도움말: 자주 묻는 질문. 답마다 가는 길을 단계로 보여주고, 색이 들어간 단계는 눌러서 바로 간다 */
export default function HelpScreen() {
  // q: 처음부터 펼쳐 둘 질문 (다른 화면의 물음표에서 올 때)
  const params = useLocalSearchParams<{ q?: string }>();
  const [openId, setOpenId] = useState<string | null>(params.q ?? null);

  const toggle = (id: string) => {
    if (openId !== id) trackStep('faq_opened', id);
    setOpenId(openId === id ? null : id);
  };

  const contact = () => {
    trackStep('faq_contact');
    router.push('/inquiry');
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="도움말" />
      <ScrollView contentContainerClassName="gap-6 px-5 pb-10 pt-2">
        <Text size={13} className="text-muted-foreground">
          질문을 누르면 답이 펼쳐져요. 답 아래의 색이 들어간 칸을 누르면 그
          화면으로 바로 가요.
        </Text>
        {FAQ_GROUPS.map((group) => (
          <View key={group.title} className="gap-2">
            <Text weight="700" size={15} className={cn('mb-1')}>
              {group.title}
            </Text>
            {group.items.map((item) => (
              <Question
                key={item.id}
                item={item}
                open={openId === item.id}
                onToggle={() => toggle(item.id)}
              />
            ))}
          </View>
        ))}
        <View className="gap-2 pt-2">
          <Text size={13} className="text-center text-muted-foreground">
            찾는 답이 없나요? 적어서 보내주시면 바로 전해져요.
          </Text>
          <Button
            label="문의하기"
            variant="outline"
            size="md"
            onPress={contact}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
