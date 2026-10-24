# 버전 관리와 출시 절차

## 버전이 두 가지 있다

| 이름                    | 어디에                                         | 언제 올리나                           |
| ----------------------- | ---------------------------------------------- | ------------------------------------- |
| 앱 버전 (`0.2.0`)       | `app.json`의 `expo.version` (+ `package.json`) | 새 빌드(APK·AAB)를 만들 때            |
| 빌드 번호 (versionCode) | EAS 서버 (`appVersionSource: remote`)          | production 빌드마다 EAS가 자동으로 +1 |

`runtimeVersion` 정책이 `appVersion`이라, **앱 버전이 같은 빌드끼리만 OTA 업데이트를 받는다.**
그래서 새 네이티브 코드가 필요한 화면 코드가 옛 빌드에 내려가서 앱이 죽는 일은 생기지 않는다.

## 어떤 걸로 내보낼까

| 바뀐 것                                                                            | 방법                    | 앱 버전 |
| ---------------------------------------------------------------------------------- | ----------------------- | ------- |
| 화면·문구·로직 (JS/TS만)                                                           | OTA (`eas update`)      | 그대로  |
| 네이티브 라이브러리 추가·업그레이드, `app.json` 플러그인·권한, Expo SDK 업그레이드 | 새 빌드 + 스토어 업로드 | 올린다  |

헷갈리면 `npx expo-doctor`를 돌리고, `expo install`로 네이티브 코드가 있는 패키지를 넣었는지 본다.

## 새 빌드 내보내는 순서

1. `app.json`의 `version`과 `package.json`의 `version`을 같이 올린다. (예: `0.2.0` → `0.3.0`)
2. production 빌드: `npx eas-cli@latest build --platform android --profile production`
3. Play Console에 AAB를 올리고 출시한다. (심사·배포가 끝날 때까지 기다린다)
4. 스토어에 새 버전이 보이면 서버의 `app_versions` 값을 바꾼다. (아래 SQL)

## 옛 빌드 사용자에게 업데이트 안내하기

앱은 스플래시가 끝난 뒤(그리고 30분 넘게 쉬었다가 다시 열 때) Supabase `app_versions` 표의 `min_version`을 읽어서 설치된 앱 버전과 비교한다.
설치 버전이 더 낮으면 앱을 덮는 "업데이트가 필요해요" 화면이 뜬다. 닫을 수 없고 "스토어에서 업데이트" 버튼으로 Play 스토어에만 갈 수 있다.
인터넷이 없거나 개발 모드면 아무것도 안 뜬다.

옛 빌드 사용자를 모두 새 버전으로 올리고 싶을 때:

```sql
update public.app_versions
set min_version = '0.3.0', updated_at = now()
where platform = 'android';
```

안내 문구를 바꾸고 싶으면 `message`에 넣는다. (비워두면 기본 문구)

```sql
update public.app_versions
set message = '사진 여러 장 올리기가 추가됐어요. 업데이트해주세요!'
where platform = 'android';
```

"스토어에서 업데이트" 버튼이 여는 주소는 `store_url`이다. 바꾸면 앱 배포 없이 바로 반영된다.
(Play 스토어 주소면 Play 스토어 앱으로 열린다. 테스트 중에는 테스트 참여 링크나 APK 주소를 넣어도 된다)

```sql
update public.app_versions
set store_url = 'https://play.google.com/store/apps/details?id=com.doit2.app'
where platform = 'android';
```

표에는 `android`, `ios` 두 줄이 있다. 위 SQL에서 `platform`만 바꾸면 iOS도 같은 방법으로 관리한다.
iOS는 아직 App Store에 없어서 `store_url`에 소개 페이지(https://doit2app.github.io)를 넣어뒀다.

## iOS 출시할 때 할 일

코드는 iOS도 같이 고려해서 만든다. 아래만 채우면 된다.

1. Apple 개발자 계정 가입 (연 99달러)
2. `npx eas-cli@latest build --platform ios --profile production` (인증서·푸시 키는 EAS가 만들어 준다. iOS 알림은 Firebase가 필요 없다)
3. 카카오 개발자 콘솔에 iOS 플랫폼(번들 ID `com.doit2.app`) 등록
4. 실제 아이폰에서 지도, 사진 올리기·앨범 저장, 공유 카드, 알림 확인
5. App Store Connect에 올리고 심사 (계정 삭제·개인정보처리방침은 이미 있다)
6. 출시되면 버전 표의 iOS 주소를 App Store 주소로 바꾼다

```sql
update public.app_versions
set store_url = 'https://apps.apple.com/app/id<앱 번호>'
where platform = 'ios';
```

## 주의

- `min_version`은 **스토어에 새 버전이 실제로 보인 뒤에** 올린다. 먼저 올리면 사람들이 업데이트할 게 없는데 앱을 못 쓰게 된다.
- 서버(Supabase) 표·함수를 바꿀 때는 되도록 옛 앱도 그대로 동작하게(열 추가만, 삭제·이름 변경은 나중에) 만든다. 꼭 깨지는 변경이면 새 빌드를 먼저 퍼뜨리고 `min_version`을 올린 다음 바꾼다.
- OTA는 같은 앱 버전 빌드에만 간다. 앱 버전을 올린 뒤 OTA를 보내면 옛 빌드 사용자는 그 OTA를 받지 못한다. 그래서 위의 업데이트 안내가 필요하다.
