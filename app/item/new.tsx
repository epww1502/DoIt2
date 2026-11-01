import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Chip,
  NavBar,
  Segmented,
  Text,
  TextField,
} from '@/components/atoms';
import { TextArea } from '@/components/atoms/TextArea';
import { BottomBar } from '@/components/bucket/BottomBar';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { GoalField } from '@/components/bucket/GoalField';
import { ItemPhotosField } from '@/components/bucket/ItemPhotosField';
import { PlaceField } from '@/components/bucket/PlaceField';
import { useKeyboardAwareForm } from '@/hooks/useKeyboardHeight';
import { deletePhoto } from '@/lib/bucket/photo';
import {
  CATEGORIES_BY_KIND,
  DEFAULT_SETTING,
  itemPhotos,
  KIND_META,
  SETTING_META,
  type BucketKind,
  type BucketSetting,
  type CategoryKey,
  type GoalInfo,
  type PlaceInfo,
  type RecordPhoto,
} from '@/lib/bucket/types';
import { KIND_ICON } from '@/components/bucket/kindIcons';
import type { SegmentedOption } from '@/components/atoms/Segmented';
import { useBucketItem, useBucketStore } from '@/store/useBucketStore';
import { usePlacePickStore } from '@/store/usePlacePickStore';
import { ensureReminderPermission } from '@/lib/reminders';

const KIND_OPTIONS: SegmentedOption<BucketKind>[] = [
  {
    value: 'place',
    label: KIND_META.place.label,
    icon: KIND_ICON.place,
  },
  {
    value: 'activity',
    label: KIND_META.activity.label,
    icon: KIND_ICON.activity,
  },
];

const SETTING_OPTIONS: { value: BucketSetting; label: string }[] = [
  {
    value: 'indoor',
    label: SETTING_META.indoor.label,
  },
  {
    value: 'outdoor',
    label: SETTING_META.outdoor.label,
  },
];

/** 버킷리스트 담기. ?id= 가 있으면 수정 */
export default function BucketFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { keyboardHeight, scrollRef, onScroll, ensureFocusedVisible } =
    useKeyboardAwareForm();
  const editing = useBucketItem(id);
  const addItem = useBucketStore((state) => state.addItem);
  const updateItem = useBucketStore((state) => state.updateItem);

  const [kind, setKind] = useState<BucketKind>(editing?.kind ?? 'place');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [category, setCategory] = useState<CategoryKey>(
    editing?.category ?? CATEGORIES_BY_KIND.place[0].key
  );
  const [setting, setSetting] = useState<BucketSetting>(
    editing?.setting ?? DEFAULT_SETTING[CATEGORIES_BY_KIND.place[0].key]
  );
  const [location, setLocation] = useState(editing?.location ?? '');
  const [place, setPlace] = useState<PlaceInfo | null>(editing?.place ?? null);
  const [memo, setMemo] = useState(editing?.memo ?? '');
  // 목표 날짜 (선택). 스위치를 켜야 보인다
  const [goal, setGoal] = useState<GoalInfo | null>(editing?.goal ?? null);
  // 사진 (최대 3장, 첫 번째가 대표). uri: 이 휴대폰 파일, path: 서버에 올라간 사진
  const [photos, setPhotos] = useState<RecordPhoto[]>(() =>
    itemPhotos(editing)
  );

  /** 이번 화면에서 새로 고른 사진이면 파일을 지운다 (저장된 사진은 저장할 때 정리) */
  const savedUris = new Set(itemPhotos(editing).map((p) => p.uri));
  const discardNewPhoto = (photo: RecordPhoto) => {
    if (photo.uri && !savedUris.has(photo.uri)) deletePhoto(photo.uri);
  };
  const cancel = () => {
    for (const photo of photos) discardNewPhoto(photo);
    router.back();
  };

  // 장소 검색 화면에서 고르고 돌아오면 받아서 채운다
  const takePicked = usePlacePickStore((state) => state.take);
  useFocusEffect(
    useCallback(() => {
      const picked = takePicked();
      if (!picked) return;
      setPlace(picked);
      setLocation(picked.address);
      // 이름을 아직 안 적었으면 가게 이름으로 채운다
      setTitle((prev) => (prev.trim() ? prev : picked.name.slice(0, 40)));
    }, [takePicked])
  );

  const openSearch = () =>
    router.push({
      pathname: '/item/search-place',
      params: { q: place?.name ?? (title.trim() || location.trim()) },
    });

  const clearPlace = () => {
    setPlace(null);
    setLocation('');
  };

  const meta = KIND_META[kind];
  const categories = CATEGORIES_BY_KIND[kind];
  const canSave = title.trim().length > 0;

  /** 카테고리를 바꾸면 실내/실외도 그 카테고리 기본값으로 맞춘다 (직접 바꿀 수 있음) */
  const changeCategory = (next: CategoryKey) => {
    setCategory(next);
    setSetting(DEFAULT_SETTING[next]);
  };

  const changeKind = (next: BucketKind) => {
    setKind(next);
    // 고른 카테고리가 새 종류에 없으면 첫 번째로 바꾼다 ('기타'는 공통)
    if (!CATEGORIES_BY_KIND[next].some((c) => c.key === category)) {
      changeCategory(CATEGORIES_BY_KIND[next][0].key);
    }
  };

  const save = () => {
    if (!canSave) return;
    const input = {
      kind,
      title: title.trim(),
      category,
      setting,
      location: location.trim(),
      place,
      memo: memo.trim(),
      goal,
      photos,
    };
    if (editing) {
      updateItem(editing.id, input);
    } else {
      addItem(input);
    }
    // 목표 날짜 알림을 골랐으면 알림 권한을 물어본다 (이미 있으면 그냥 넘어간다)
    if (goal && goal.remind.length > 0) {
      void ensureReminderPermission(true).catch(() => {});
    }
    router.back();
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar
        title={editing ? '버킷리스트 수정' : '버킷리스트 담기'}
        onBack={cancel}
      />
      {/* 키보드 높이만큼 아래를 비워서 입력칸과 버튼을 키보드 위로 올린다 */}
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
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
              onFocus={ensureFocusedVisible}
            />
          </View>

          <ItemPhotosField
            photos={photos}
            onChange={setPhotos}
            onRemove={discardNewPhoto}
          />

          <View>
            <FieldLabel>카테고리</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((c) => (
                <Chip
                  key={c.key}
                  category={c.key}
                  label={c.label}
                  selected={category === c.key}
                  onPress={() => changeCategory(c.key)}
                />
              ))}
            </View>
          </View>

          <View>
            <FieldLabel>실내에서 해요, 밖에서 해요?</FieldLabel>
            <Segmented
              options={SETTING_OPTIONS}
              value={setting}
              onChange={setSetting}
            />
            <Text variant="muted" size={12} className="mt-2">
              비 오는 날에는 &apos;오늘 뭐 하지&apos;에서 실외를 빼고 뽑아요
            </Text>
          </View>

          <PlaceField
            label={meta.locationLabel}
            placeholder={meta.locationPlaceholder}
            place={place}
            location={location}
            onChangeLocation={setLocation}
            onSearch={openSearch}
            onClear={clearPlace}
            onFocus={ensureFocusedVisible}
          />

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
              onFocus={ensureFocusedVisible}
            />
          </View>

          <GoalField value={goal} onChange={setGoal} />
        </ScrollView>

        <BottomBar>
          <Button
            label={editing ? '저장하기' : '담기'}
            disabled={!canSave}
            onPress={save}
          />
        </BottomBar>
      </View>
    </SafeAreaView>
  );
}
