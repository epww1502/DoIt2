import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

/**
 * 길게 눌러 여러 개 고르기.
 * - start(id): 고르기 모드를 켜고 그 항목을 고른다 (진동)
 * - toggle(id): 고르기/빼기. 하나도 안 남으면 고르기 모드가 꺼진다
 * - 안드로이드 뒤로가기를 누르면 고르기 모드가 꺼진다
 */
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const selecting = selected.size > 0;

  const start = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => {}
    );
    setSelected(new Set([id]));
  }, []);

  const toggle = useCallback((id: string) => {
    void Haptics.selectionAsync().catch(() => {});
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  useEffect(() => {
    if (!selecting) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      clear();
      return true;
    });
    return () => sub.remove();
  }, [selecting, clear]);

  return { selected, selecting, start, toggle, selectAll, clear };
}
