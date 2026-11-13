# App Store Connect 설문 답안

App Store Connect에서 아래대로 고르면 된다. `play-store/app-content-ko.md`와 같은 앱 동작을 Apple 질문 형식에 맞춘 것이다.
앱 동작이 바뀌면(광고, 로그인, 분석 도구, 결제 추가 등) 이 문서도 같이 고친다.

## 앱 개인정보 보호 (App Privacy)

앱 → **앱 개인정보 보호** → 시작하기

### 처음 질문

| 질문                                         | 답                                           |
| -------------------------------------------- | -------------------------------------------- |
| 이 앱에서 데이터를 수집합니까?               | **예**                                       |
| 데이터를 추적(Tracking) 목적으로 사용합니까? | 모든 항목에서 **아니요** (광고 ID·광고 없음) |

### 수집하는 데이터

모든 항목의 공통 답: **용도 = 앱 기능**, **사용자에게 연결됨 = 예**(익명 계정에 묶여 저장된다), **추적 = 아니요**.

| Apple 분류    | 항목               | 앱에서 무엇                             |
| ------------- | ------------------ | --------------------------------------- |
| 연락처 정보   | 이름               | 닉네임 (선택)                           |
| 사용자 콘텐츠 | 사진 또는 비디오   | 기록 사진, 프로필·공간 사진             |
| 사용자 콘텐츠 | 기타 사용자 콘텐츠 | 버킷리스트 항목, 후기, 별점, 댓글, 반응 |
| 식별자        | 사용자 ID          | 익명 계정 ID                            |
| 식별자        | 기기 ID            | 알림 토큰                               |

### 수집하지 않음으로 두는 것

- **위치**: 날씨를 볼 때 좌표를 Open-Meteo에 보내지만 그 자리에서 날씨만 받아오고 어디에도 저장하지 않는다.
  Apple 기준의 '수집'은 실시간 요청을 처리하는 데 필요한 시간보다 오래 볼 수 있게 보내는 것이라 해당하지 않는다.
  더 보수적으로 가고 싶으면 위치 → 대략적인 위치·정확한 위치, 앱 기능, **연결되지 않음**으로 넣어도 된다.
- **검색 기록**: 카카오 장소 검색어도 실시간 검색에만 쓰고 저장하지 않는다.
- **AI 기능에 보내는 글**: 버튼을 눌렀을 때만 항목 이름과 직접 쓴 글을 Anthropic(Claude)에 보내 답만 받아오고 앱 서버에는 사용 횟수만 남긴다.
  처음 쓸 때 한 번 '외부 AI 서비스로 전달된다'는 안내와 동의를 받는다 (심사 지침 5.1.2: 개인 데이터를 외부 AI에 보내기 전에 알리고 허락받기).
- 이메일, 전화번호, 주소, 결제 정보, 건강, 연락처, 브라우징 기록, 사용 데이터(분석), 진단(오류·성능 기록), 광고 데이터: 수집하지 않음.

## 연령 등급

앱 정보 → **연령 등급** → 편집. 예상 결과: **4+**

| 분류             | 항목                                 | 답         | 이유                                                             |
| ---------------- | ------------------------------------ | ---------- | ---------------------------------------------------------------- |
| 앱 내 제어 기능  | 자녀 보호 기능 / 연령 확인           | 아니요     |                                                                  |
| 기능             | 제한 없는 웹 접근                    | **아니요** | 앱 안에 주소창 있는 브라우저가 없다 (지도 웹뷰는 카카오 지도만)  |
| 기능             | 사용자 생성 콘텐츠                   | **아니요** | 초대한 공간 멤버끼리만 보인다. Apple 정의는 '넓게 퍼지는' 콘텐츠 |
| 기능             | 소셜 미디어                          | **아니요** | 피드로 퍼뜨리는 기능이 없다                                      |
| 기능             | 메시지 및 채팅                       | **예**     | 같은 공간 멤버끼리 항목에 댓글을 남긴다 (등급은 그대로 4+)       |
| 기능             | 광고                                 | 아니요     |                                                                  |
| 성숙한 주제      | 욕설, 공포, 술·담배·약물             | 없음       |                                                                  |
| 의료 또는 건강   | 의료 정보, 건강·웰니스 주제          | 없음       |                                                                  |
| 선정성 또는 노출 | 전부                                 | 없음       |                                                                  |
| 폭력             | 전부                                 | 없음       |                                                                  |
| 우연 기반 활동   | 도박, 모의 도박, 콘테스트, 루트 박스 | 없음       | '뽑기'는 담아둔 목록에서 하나 고르는 기능이라 해당 없음          |

심사에서 사용자끼리 콘텐츠를 주고받는 앱에 필요한 신고·차단 기능(가이드라인 1.2)을 물어볼 수 있다.
그때는 아래 심사 메모의 "Content sharing" 문단처럼 '초대 코드로 들어온 사람끼리만 보이고, 모르는 사람에게 노출되지 않는다'고 답한다.
그래도 요구하면 댓글 신고·멤버 내보내기 같은 기능을 만들어야 한다.

## 수출 규정 (암호화)

`app.json`에 `ios.config.usesNonExemptEncryption: false`를 넣어서 빌드마다 묻지 않는다.
혹시 물어보면: **표준 암호화(HTTPS)만 사용 → 면제 대상, 문서 제출 필요 없음**.

## 콘텐츠 권한

| 질문                                        | 답                                                           |
| ------------------------------------------- | ------------------------------------------------------------ |
| 앱에 제3자 콘텐츠가 있거나 표시·접근합니까? | **예** — 카카오 지도·장소 정보 (카카오 API 약관에 따라 사용) |
| 그 콘텐츠를 쓸 권리가 있습니까?             | **예**                                                       |

## 앱 심사 정보 (App Review Information)

| 칸          | 값                               |
| ----------- | -------------------------------- |
| 로그인 필요 | **체크 해제** (심사용 계정 없음) |
| 연락처      | 이름·전화번호·이메일 — 직접 입력 |
| 메모        | 아래 영어 문단을 그대로 붙여넣기 |

### 심사 메모 (영어로 붙여넣기)

```
Thank you for reviewing DoIt2.

No login is required. On first launch the app creates an anonymous account automatically, so there is no demo account. All features are available right away.

How to try the main features:
1. Bucket list tab: tap "+" to add a place (가보기) or an activity (해보기). Place search uses Kakao (Korean map service).
2. Mark an item as done to add a date, star rating, short review and up to 5 photos.
3. "오늘 뭐 하지" tab: tap "뽑기" to randomly pick one item from your own list. If it is raining at your location, outdoor items are excluded. This is not gambling; nothing is purchased or won.
4. "함께한 것" tab: view done items as a list, calendar, map, or yearly summary ("추억 모아보기").

Content sharing:
Users can create a shared space and invite others with an invite code (up to 10 members). Items, records, photos and comments are visible only to members of that space. There is no public feed, search for other users, or way to contact strangers. A member can leave a space at any time, and the space owner can remove members.

Permissions:
- Location (when in use): only to check today's weather. Coordinates are sent to Open-Meteo in real time and are not stored.
- Photos: only photos the user picks are uploaded to their records. Saving a share card to the photo library is optional.
- Notifications: alerts when a space member adds an item or record.

Account deletion: Settings (설정) > My profile (내 프로필) > Delete account (계정 삭제). Web request page: https://doit2app.github.io/delete-account.html

The app is free, has no ads, no in-app purchases, and no tracking.
```

## 개인정보처리방침에서 고치면 좋은 곳 (선택)

`site/privacy.html`의 "함께 처리하는 곳" 표에는 알림 전달 업체로 Google Firebase(안드로이드)만 있다.
iOS 알림은 Apple(APNs)을 거치니 **Apple — iOS 알림 전달** 한 줄을 더하면 iOS 출시와 맞는다. 심사에 걸리는 수준은 아니다.
