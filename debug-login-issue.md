# 로그인 반복 문제 분석 - 확인 완료

## 재현 확인
- /community 페이지 비로그인 접근 → /login으로 리다이렉트됨 (확인!)
- URL: https://meetup-trav-9l2ufkgm.manus.space/community → /login

## 원인
1. CommunityChat의 RoomList 컴포넌트에서 chatRoom.list, chatRoom.myRooms, chatRoom.unreadCounts를 enabled 조건 없이 호출
2. 모두 protectedProcedure → "Please login (10001)" 에러 발생
3. main.tsx 글로벌 핸들러가 /login으로 리다이렉트

## 수정 계획
1. main.tsx: 현재 /login 페이지면 리다이렉트 하지 않도록 수정 (무한 루프 방지)
2. main.tsx: 공개 페이지 목록 정의하여 해당 페이지에서는 UNAUTHORIZED 리다이렉트 하지 않도록 수정
3. CommunityChat: 비로그인 시 로그인 안내 화면 표시 + 쿼리에 enabled: !!user 조건 추가
4. 기타 공개 페이지에서 protected 쿼리 호출 시 enabled 조건 확인
