import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, NavBar, TextField } from '@/components/atoms';
import { TextArea } from '@/components/atoms/TextArea';
import { FieldLabel } from '@/components/place/FieldLabel';
import { CATEGORIES, type CategoryKey } from '@/lib/place/types';
import { usePlace, usePlaceStore } from '@/store/usePlaceStore';

/** 갈 곳 담기. ?id= 가 있으면 수정 */
export default function PlaceFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = usePlace(id);
  const addPlace = usePlaceStore((state) => state.addPlace);
  const updatePlace = usePlaceStore((state) => state.updatePlace);

  const [title, setTitle] = useState(editing?.title ?? '');
  const [category, setCategory] = useState<CategoryKey>(
    editing?.category ?? 'food'
  );
  const [location, setLocation] = useState(editing?.location ?? '');
  const [memo, setMemo] = useState(editing?.memo ?? '');

  const canSave = title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const input = {
      title: title.trim(),
      category,
      location: location.trim(),
      memo: memo.trim(),
    };
    if (editing) {
      updatePlace(editing.id, input);
    } else {
      addPlace(input);
    }
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavBar title={editing ? '장소 수정' : '갈 곳 담기'} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-8 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <FieldLabel>어디 가고 싶어요?</FieldLabel>
            <TextField
              value={title}
              onChangeText={setTitle}
              placeholder="예) 성수동 그 파스타집"
              autoFocus={!editing}
              returnKeyType="next"
              maxLength={40}
            />
          </View>

          <View>
            <FieldLabel>카테고리</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.key}
                  label={`${c.emoji} ${c.label}`}
                  selected={category === c.key}
                  onPress={() => setCategory(c.key)}
                />
              ))}
            </View>
          </View>

          <View>
            <FieldLabel>위치 (선택)</FieldLabel>
            <TextField
              value={location}
              onChangeText={setLocation}
              placeholder="예) 서울 성동구"
              maxLength={40}
            />
          </View>

          <View>
            <FieldLabel>메모 (선택)</FieldLabel>
            <TextArea
              value={memo}
              onChangeText={setMemo}
              placeholder="예약 필수, 웨이팅 김, 크림 파스타가 유명함"
              maxLength={300}
            />
          </View>
        </ScrollView>

        <View className="px-5 pb-4 pt-2">
          <Button
            label={editing ? '저장하기' : '담기'}
            disabled={!canSave}
            onPress={save}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
