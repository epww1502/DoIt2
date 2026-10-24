import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, NavBar, Segmented, TextField } from '@/components/atoms';
import { TextArea } from '@/components/atoms/TextArea';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import {
  CATEGORIES_BY_KIND,
  KIND_META,
  type BucketKind,
  type CategoryKey,
} from '@/lib/bucket/types';
import { useBucketItem, useBucketStore } from '@/store/useBucketStore';

const KIND_OPTIONS: { value: BucketKind; label: string }[] = [
  { value: 'place', label: `${KIND_META.place.emoji} 갈 곳` },
  { value: 'activity', label: `${KIND_META.activity.emoji} 할 것` },
];

/** 버킷리스트 담기. ?id= 가 있으면 수정 */
export default function BucketFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = useBucketItem(id);
  const addItem = useBucketStore((state) => state.addItem);
  const updateItem = useBucketStore((state) => state.updateItem);

  const [kind, setKind] = useState<BucketKind>(editing?.kind ?? 'place');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [category, setCategory] = useState<CategoryKey>(
    editing?.category ?? CATEGORIES_BY_KIND.place[0].key
  );
  const [location, setLocation] = useState(editing?.location ?? '');
  const [memo, setMemo] = useState(editing?.memo ?? '');

  const meta = KIND_META[kind];
  const categories = CATEGORIES_BY_KIND[kind];
  const canSave = title.trim().length > 0;

  const changeKind = (next: BucketKind) => {
    setKind(next);
    // 고른 카테고리가 새 종류에 없으면 첫 번째로 바꾼다 ('기타'는 공통)
    if (!CATEGORIES_BY_KIND[next].some((c) => c.key === category)) {
      setCategory(CATEGORIES_BY_KIND[next][0].key);
    }
  };

  const save = () => {
    if (!canSave) return;
    const input = {
      kind,
      title: title.trim(),
      category,
      location: location.trim(),
      memo: memo.trim(),
    };
    if (editing) {
      updateItem(editing.id, input);
    } else {
      addItem(input);
    }
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavBar title={editing ? '버킷리스트 수정' : '버킷리스트 담기'} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-8 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          <Segmented
            options={KIND_OPTIONS}
            value={kind}
            onChange={changeKind}
          />

          <View>
            <FieldLabel>{meta.question}</FieldLabel>
            <TextField
              value={title}
              onChangeText={setTitle}
              placeholder={meta.placeholder}
              autoFocus={!editing}
              returnKeyType="next"
              maxLength={40}
            />
          </View>

          <View>
            <FieldLabel>카테고리</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((c) => (
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
            <FieldLabel>{meta.locationLabel}</FieldLabel>
            <TextField
              value={location}
              onChangeText={setLocation}
              placeholder={meta.locationPlaceholder}
              maxLength={40}
            />
          </View>

          <View>
            <FieldLabel>메모 (선택)</FieldLabel>
            <TextArea
              value={memo}
              onChangeText={setMemo}
              placeholder={
                kind === 'place'
                  ? '예약 필수, 웨이팅 김, 크림 파스타가 유명함'
                  : '준비물, 참고할 영상 링크, 하고 싶은 이유'
              }
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
