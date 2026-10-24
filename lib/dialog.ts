/**
 * 앱 스타일 팝업. 안드로이드 기본 Alert 대신 쓴다 (DialogHost가 루트에서 그린다).
 * 쓰는 법은 Alert.alert와 같다: showAlert(제목, 설명?, 버튼들?, { cancelable? })
 */
import { create } from 'zustand';

export type DialogButton = {
  text: string;
  /** cancel: 회색, destructive: 빨간색, 그 외: 테마색 */
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

export type DialogRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
  /** 바깥을 누르거나 뒤로가기로 닫을 수 있는지 */
  cancelable: boolean;
};

type DialogState = {
  queue: DialogRequest[];
  push: (request: DialogRequest) => void;
  /** 맨 앞 팝업을 닫는다 */
  shift: () => void;
};

export const useDialogStore = create<DialogState>((set) => ({
  queue: [],
  push: (request) => set((s) => ({ queue: [...s.queue, request] })),
  shift: () => set((s) => ({ queue: s.queue.slice(1) })),
}));

let nextId = 1;

export function showAlert(
  title: string,
  message?: string,
  buttons?: DialogButton[],
  options?: { cancelable?: boolean }
) {
  const list = buttons && buttons.length > 0 ? buttons : [{ text: '확인' }];
  useDialogStore.getState().push({
    id: nextId++,
    title,
    message,
    buttons: list,
    cancelable: options?.cancelable ?? true,
  });
}
