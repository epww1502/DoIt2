# App Review 답장 (Guideline 2.1 - Information Needed)

2026-10-27, 빌드 0.2.0 (2) 첫 심사에서 받은 추가 정보 요청에 대한 답장.
신고·차단 기능을 넣은 **빌드 3**을 올리고 그 빌드로 녹화·재제출한다.
아래 "답장" 영어 부분을 **App Store Connect 메시지 답장**과 **앱 심사 정보 > 메모** 두 곳에 모두 붙여넣는다 (Apple 요청).
화면 녹화 파일은 답장에 첨부한다.

## 화면 녹화 찍는 순서 (실제 iPhone, 최신 iOS)

설정 > 제어 센터에 "화면 기록"을 추가하고, 녹화를 시작한 뒤 아래 순서대로 진행한다.
빠짐없이 보이는 게 중요하고, 길이는 3~5분이면 충분하다.

1. **앱을 지운 상태에서 시작**: 홈 화면에서 DoIt2 아이콘을 눌러 실행한다 (Apple: 녹화는 앱 실행부터 시작해야 함).
2. 처음 화면 → 익명 계정이 자동으로 만들어지는 모습 (= 가입 흐름). 권한 팝업(위치·알림)이 뜨면 허용한다.
3. 버킷리스트 탭: "+" → 가보기 장소 검색으로 하나 추가, 해보기 하나 추가.
4. 항목 하나를 완료 처리 → 날짜·별점·한 줄 후기·사진 1장.
5. "오늘 뭐 하지" 탭: 뽑기.
6. "함께한 것" 탭: 목록 → 달력 → 지도 → 추억 모아보기.
7. 공간: 공간 만들기 → 초대 코드 보이기 → 댓글 하나 달기. **다른 사람이 한 명 들어와 댓글을 남겨 둔 상태여야 한다** (다른 폰이나 시뮬레이터 계정으로 미리 준비).
   - 다른 사람 댓글을 길게 눌러 **댓글 신고하기** → 사유 고르기 → "신고했어요" → **차단하기** → 그 사람 댓글이 사라지는 것까지.
   - 공간 관리의 멤버 목록에서 그 사람 ⋯ → **신고하기**, **차단 풀기**, (공간장이면) **내보내기** 메뉴 보이기.
8. 설정 → 내 프로필 → **계정 코드** 보이기 (= 로그인/계정 불러오기 흐름).
9. 설정 → 내 프로필 → **계정 삭제** → 끝까지 진행해서 처음 화면으로 돌아가는 것까지.

## 답장 (영어로 붙여넣기)

```
Hello App Review team,

Thank you for the review. Here is the information you requested. A screen recording captured on a physical iPhone running the latest iOS is attached. It starts from launching the app and shows account creation, the main features, shared spaces with comments, member removal, the account code (sign-in on another device), and account deletion.

1. Screen recording
Attached to this reply.

2. Purpose and target audience
DoIt2 is a shared bucket list for couples, friends and families in Korea. People often say "let's go there someday" and then forget. DoIt2 lets them save places to visit and things to try in one list, pick one at random when they cannot decide what to do today (outdoor items are skipped when it rains), and record what they did together with a date, star rating, short review and photos. Done items can be looked back on as a list, calendar, map and yearly summary. The target audience is adults and teens in Korea who plan outings with a partner, friends or family. The app is free with no ads, no in-app purchases and no tracking.

3. Setup and access
No login credentials are needed. On first launch the app creates an anonymous account automatically, so all features are available immediately.
- Bucket list tab: tap "+" to add a place (가보기, place search) or an activity (해보기).
- Mark an item as done to add a date, star rating, review and up to 5 photos.
- "오늘 뭐 하지" tab: tap "뽑기" to randomly pick one of your own items. This is not gambling; nothing is purchased or won.
- "함께한 것" tab: list, calendar, map and yearly summary ("추억 모아보기").
- Shared space: create a space and share its invite code; another user joins by entering the code (up to 10 members).
- Settings (설정) > My profile (내 프로필) > Account code (계정 코드): a secret code that restores the same anonymous account on another phone. This is the only "login" in the app.
- Settings (설정) > My profile (내 프로필) > Delete account (계정 삭제): deletes the account and all of its data. Web request page: https://doit2app.github.io/delete-account.html

User-generated content, reporting and blocking: items, records, photos and comments are visible only to members of the same private space, who joined with an invite code shared by someone they know. There is no public feed, user search or way to contact strangers.
- Report: long-press another member's comment > "댓글 신고하기" (report comment), or Space management > member list > "..." > "신고하기" (report member), then pick a reason. Reports go to the developer, who reviews them and acts within 24 hours (removing the content and, if needed, the user's account).
- Block: long-press a comment > "차단하기" (block), or member list > "..." > "차단하기". Comments from a blocked user are hidden from the blocker immediately (filtered on the server). It can be undone from the member list ("차단 풀기").
- The space owner can remove any member ("내보내기"), and any member can leave a space at any time.
- Contact: doit2team@gmail.com

4. External services
- Supabase: anonymous authentication, database, photo storage and server functions
- Kakao Local API and Kakao Maps (JavaScript SDK in a web view): place search and maps
- Open-Meteo: current weather for the user's location (coordinates are not stored)
- Expo Push Notification service (Apple Push Notification service): alerts when a space member adds an item or record
- Expo EAS Update: delivering app updates

5. Regional differences
The app works the same in all regions. The UI is in Korean. Place search and maps use Kakao, which covers places in Korea best; outside Korea, place search may return few or no results, but activities (해보기) need no place, and all other features work normally.

6. Regulated industry / third-party material
Not applicable. The app is not in a regulated industry. Map and place data come from Kakao under the Kakao Developers terms of use.

Thank you.
```
