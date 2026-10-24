# DoIt2 (두잇투)

연인, 친구, 가족과 함께 쓰는 버킷리스트 + 기록 앱.

- 공간을 만들고 초대 코드로 최대 10명까지 함께 쓰기 (한 사람이 여러 공간에 들어갈 수 있다)
- 가고 싶은 곳(📍)과 해보고 싶은 것(✅)을 함께 모으기
- 카카오 장소 검색, 지도에서 장소 고르기
- 함께한 것에 사진·별점·한 줄 후기 남기기
- "오늘 뭐 하지?" 랜덤 뽑기 (비 오는 날은 실외 제외)

Expo SDK 58 · Expo Router · NativeWind v4 · Supabase

## 개발

1. `.env.example`을 `.env`로 복사하고 Supabase 주소와 공개 키를 채운다.
2. Supabase 대시보드에서 익명 로그인을 켜고, Edge Functions 시크릿에 `KAKAO_REST_API_KEY`를 넣는다.
3. `npx expo start`

데이터베이스 변경(SQL)은 `supabase/migrations`, 서버 함수는 `supabase/functions`에 있다.
