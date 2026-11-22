import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, NavBar, Text, TextField } from '@/components/atoms';
import { TextArea } from '@/components/atoms/TextArea';
import { BottomBar } from '@/components/bucket/BottomBar';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { installedVersion } from '@/lib/appVersion';
import { showAlert } from '@/lib/dialog';
import { FAQ_CONTACT_EMAIL, faqContactUrl } from '@/lib/faq';
import {
  INQUIRY_CONTACT_MAX_LENGTH,
  INQUIRY_MAX_LENGTH,
  sendInquiry,
} from '@/lib/inquiry';
import { trackStep } from '@/lib/steps';

/** 문의하기: 적어서 보내면 만든 사람에게 바로 전해진다 (도움말에서 온다) */
export default function InquiryScreen() {
  const keyboardHeight = useKeyboardHeight();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendInquiry(message, contact);
      trackStep('inquiry_sent', contact.trim() ? 'contact' : 'no_contact');
      showAlert(
        '문의를 보냈어요',
        contact.trim()
          ? '확인하고 적어주신 연락처로 답해 드릴게요.'
          : '잘 읽어 볼게요. 고맙습니다.'
      );
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : '보내지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const mail = () =>
    void Linking.openURL(faqContactUrl(installedVersion(), Platform.OS)).catch(
      () =>
        showAlert(
          '메일 앱을 열지 못했어요',
          `${FAQ_CONTACT_EMAIL}으로 보내주세요.`
        )
    );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="문의하기" />
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-8 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          <Text size={13} className="text-muted-foreground">
            궁금한 점, 안 되는 것, 있었으면 하는 기능을 적어주세요. 만든
            사람에게 바로 전해져요.
          </Text>
          <View>
            <FieldLabel>내용</FieldLabel>
            <TextArea
              value={message}
              onChangeText={setMessage}
              placeholder="예: 초대 링크를 눌렀는데 앱이 안 열려요"
              maxLength={INQUIRY_MAX_LENGTH}
              autoFocus
              className="min-h-[160px]"
            />
          </View>
          <View>
            <FieldLabel>답장받을 연락처 (선택)</FieldLabel>
            <TextField
              value={contact}
              onChangeText={setContact}
              placeholder="이메일이나 카카오톡 아이디"
              maxLength={INQUIRY_CONTACT_MAX_LENGTH}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text size={12} className="mt-2 text-muted-foreground">
              가입 없이 쓰는 앱이라, 연락처를 적지 않으면 답을 드릴 수 없어요.
              적어주신 연락처는 답장에만 써요.
            </Text>
          </View>
          {error ? (
            <Text size={13} className="text-destructive">
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={mail}
            className="active:opacity-60"
          >
            <Text size={13} className="text-center text-muted-foreground">
              메일로 보내고 싶다면 {FAQ_CONTACT_EMAIL}
            </Text>
          </Pressable>
        </ScrollView>
        <BottomBar>
          <Button
            label={busy ? '보내는 중…' : '보내기'}
            disabled={busy || !message.trim()}
            onPress={() => void send()}
          />
        </BottomBar>
      </View>
    </SafeAreaView>
  );
}
