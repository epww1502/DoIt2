/**
 * 도움말(자주 묻는 질문)의 내용. 화면은 app/help.tsx.
 * 답마다 '어디를 누르면 되는지'를 단계로 적는다. href가 있는 단계는 누르면 그 화면으로 바로 간다.
 * 글만 바꾸는 것은 OTA로 나간다.
 */

import type { Href } from 'expo-router';

/** 한 단계. href가 있으면 누를 수 있다 (앱 안의 화면 주소). 없으면 그 화면 안에서 누를 것이나 폰에서 할 일 */
// 화면 주소를 Href로 두면, 없는 화면을 적었을 때 타입 검사에서 걸린다
export type FaqStep = { label: string; href?: Href };

export type FaqItem = {
  /** 어떤 질문을 열어 봤는지 셀 때 쓴다 (영문 소문자와 _) */
  id: string;
  question: string;
  answer: string;
  /** 가는 길. 길이 여러 개면 줄마다 하나씩 보여준다 */
  paths?: FaqStep[][];
};

export type FaqGroup = { title: string; items: FaqItem[] };

/** 아래 탭 화면들. 여기로 갈 때는 도움말을 닫고 그 탭으로 돌아간다 */
export const FAQ_TAB_HREFS: Href[] = ['/', '/done', '/pick', '/settings'];

const TAB_LIST: FaqStep = { label: '목록', href: '/' };
const TAB_DONE: FaqStep = { label: '일지', href: '/done' };
const TAB_PICK: FaqStep = { label: '추천', href: '/pick' };
const TAB_SETTINGS: FaqStep = { label: '설정', href: '/settings' };
const SPACE: FaqStep = { label: '공간 관리', href: '/space' };
const SPACE_LIST: FaqStep = { label: '내 공간', href: '/space/list' };
const PROFILE: FaqStep = { label: '내 프로필', href: '/profile' };

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: '같이 쓰기',
    items: [
      {
        id: 'invite',
        question: '같이 쓸 사람은 어떻게 초대해요?',
        answer:
          '공간 관리에서 초대 코드를 보내요. 받은 사람이 링크를 누르거나 6자리 코드를 넣으면 들어와요. 한 공간에 여러 명이 같이 쓸 수 있어요.',
        paths: [[TAB_SETTINGS, SPACE, { label: '초대 코드 보내기' }]],
      },
      {
        id: 'join',
        question: '초대를 받았는데 어떻게 들어가요?',
        answer:
          '받은 링크를 누르면 앱이 열리고 코드가 채워져 있어요. 안 열리면 초대 글에 적힌 6자리 코드를 직접 넣어요.',
        paths: [
          [
            TAB_SETTINGS,
            SPACE_LIST,
            { label: '초대 코드로 들어가기', href: '/space/join' },
          ],
        ],
      },
      {
        id: 'space',
        question: "'공간'이 뭐예요? 여러 개 만들 수 있나요?",
        answer:
          '같이 쓰는 사람들과 버킷리스트를 나눠 쓰는 방이에요. 연인, 친구, 가족처럼 따로 만들 수 있고 20개까지 들어갈 수 있어요. 목록 화면 맨 위의 공간 이름을 누르면 다른 공간으로 바꿔요.',
        paths: [
          [TAB_LIST, { label: '맨 위 공간 이름' }],
          [SPACE_LIST, { label: '새 공간 만들기', href: '/space/new' }],
        ],
      },
      {
        id: 'nickname',
        question: "상대에게 내 이름이 '익명'으로 보여요",
        answer:
          '닉네임을 정하지 않아서 그래요. 내 프로필에서 정하면 모든 공간에 보여요. 공간마다 다른 이름을 쓰려면 공간 관리의 멤버에서 내 줄을 눌러요.',
        paths: [
          [TAB_SETTINGS, PROFILE, { label: '닉네임' }],
          [SPACE, { label: '멤버에서 내 줄' }],
        ],
      },
      {
        id: 'personal',
        question: "개인 공간과 '나만 보기'는 뭐가 달라요?",
        answer:
          "'나만 보기'에 담은 것은 이 폰에만 있어서, 폰을 바꾸거나 앱을 지우면 사라져요. 개인 공간은 나만 볼 수 있지만 서버에 저장돼서 폰을 바꿔도 남아요. 오래 둘 것은 개인 공간에 담는 걸 권해요.",
        paths: [[SPACE_LIST, { label: '새 공간 만들기', href: '/space/new' }]],
      },
    ],
  },
  {
    title: '담기와 기록',
    items: [
      {
        id: 'share_in',
        question: '다른 앱에서 본 곳을 바로 담을 수 있나요?',
        answer:
          "지도나 브라우저에서 '공유'를 누르고 DoIt2를 고르면 담기 화면이 열려요. 장소 이름과 링크가 채워져 있어요. 앱 안에서 바로 담을 수도 있어요.",
        paths: [
          [{ label: '다른 앱' }, { label: '공유' }, { label: 'DoIt2' }],
          [{ label: '새로 담기', href: '/item/new' }],
        ],
      },
      {
        id: 'pick',
        question: "'오늘 뭐 하지'는 어떻게 뽑아요? 비 오는 날은요?",
        answer:
          "추천 탭에서 뽑아요. 위치를 허용하면 오늘 날씨를 보고, 비가 오면 실외는 빼고 뽑아요. 같이 뽑고 싶으면 '실외 포함'을 켜요.",
        paths: [[TAB_PICK, { label: '뽑기' }]],
      },
      {
        id: 'record',
        question: '다녀온 뒤 기록은 어떻게 남겨요?',
        answer:
          '목록에서 다녀온 항목을 열어 기록을 남겨요. 별점, 소감, 사진을 넣을 수 있고 같은 공간 사람들만 볼 수 있어요. 남긴 기록은 일지 탭에 모여요.',
        paths: [
          [TAB_LIST, { label: '항목 누르기' }, { label: '기록 남기기' }],
          [TAB_DONE],
        ],
      },
      {
        id: 'trash',
        question: '실수로 지웠어요. 되살릴 수 있나요?',
        answer:
          "공간에서 지운 항목은 기록, 사진, 댓글과 함께 휴지통에 48시간 동안 남아요. 그 안에 되살릴 수 있어요. '나만 보기'에서 지운 것은 바로 지워져요.",
        paths: [[TAB_SETTINGS, { label: '휴지통', href: '/trash' }]],
      },
    ],
  },
  {
    title: '계정과 폰 바꾸기',
    items: [
      {
        id: 'account',
        question: '가입을 안 했는데 내 기록은 어디에 저장돼요?',
        answer:
          "가입 없이 쓸 수 있게 계정이 저절로 만들어져요. 공간에 담은 것은 서버에 저장되고, '나만 보기'에 담은 것은 이 폰에만 있어요.",
      },
      {
        id: 'move_phone',
        question: '폰을 바꾸면 어떻게 옮겨요?',
        answer:
          "지금 폰의 내 프로필에서 계정 코드를 확인해 두고, 새 폰에서 그 코드를 넣어 불러와요. '나만 보기'에 담은 것은 옮겨지지 않으니 먼저 공간으로 옮겨 두세요.",
        paths: [
          [TAB_SETTINGS, PROFILE, { label: '계정 코드' }],
          [{ label: '쓰던 계정 불러오기', href: '/account/restore' }],
        ],
      },
      {
        id: 'delete_account',
        question: '계정과 기록을 지우고 싶어요',
        answer:
          '내 프로필 맨 아래에서 지울 수 있어요. 혼자 쓰는 공간과 그 안의 기록·사진이 모두 지워지고, 함께 쓰는 공간에서는 나가요. 되돌릴 수 없어요.',
        paths: [[TAB_SETTINGS, PROFILE, { label: '맨 아래 계정 지우기' }]],
      },
    ],
  },
  {
    title: '홈 화면과 알림',
    items: [
      {
        id: 'widget',
        question: '홈 화면 위젯은 어떻게 넣어요?',
        answer:
          "홈 화면의 빈 곳을 길게 눌러 위젯을 고르고 DoIt2를 찾아요. '1년 전 오늘', '다가오는 날', '다음에 할 것', '오늘 뭐 하지' 네 가지가 있어요. 앱 아이콘도 바꿀 수 있어요.",
        paths: [
          [
            { label: '홈 화면 길게 누르기' },
            { label: '위젯' },
            { label: 'DoIt2' },
          ],
          [TAB_SETTINGS, { label: '앱 아이콘', href: '/app-icon' }],
        ],
      },
      {
        id: 'notifications',
        question: '알림이 안 와요 / 너무 많이 와요',
        answer:
          '설정의 알림에서 켜고 끄거나 받을 종류를 골라요. 켰는데도 안 오면 휴대폰 설정에서 DoIt2 알림이 허용돼 있는지 봐 주세요. 지나간 알림은 알림함에 모여 있어요.',
        paths: [
          [TAB_SETTINGS, { label: '알림' }],
          [{ label: '알림함', href: '/notifications' }],
        ],
      },
    ],
  },
];

export const FAQ_CONTACT_EMAIL = 'doit2team@gmail.com';

/** 문의 메일 쓰기 주소. 답하기 쉽게 제목에 앱 버전과 폰 종류를 넣어 둔다 */
export function faqContactUrl(version: string, platform: string) {
  const subject = `DoIt2 문의 (v${version}, ${platform})`;
  return `mailto:${FAQ_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
