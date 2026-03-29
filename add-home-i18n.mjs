import fs from 'fs';

const newHomeKeys = {
  // ── 역할 표시 ──
  "role_superadmin": { ko: "슈퍼관리자", en: "Super Admin" },
  "role_admin": { ko: "관리자", en: "Admin" },
  "role_user": { ko: "참석자", en: "Attendee" },
  "role_partner_label": { ko: "파트너", en: "Partner" },

  // ── 일반 유저(참석자) 아이콘 ──
  "u_apply": { ko: "밋업 신청", en: "Apply" },
  "u_transport": { ko: "교통편 확인", en: "Transport" },
  "u_schedule": { ko: "일정표", en: "Schedule" },
  "u_team_chat": { ko: "팀 채팅", en: "Team Chat" },
  "u_hotel_info": { ko: "호텔 정보", en: "Hotel Info" },
  "u_ride": { ko: "차량 호출", en: "Ride" },
  "u_delivery": { ko: "음식 배달", en: "Delivery" },
  "u_map": { ko: "지도", en: "Map" },
  "u_memo": { ko: "메모", en: "Memo" },
  "u_translator": { ko: "통역", en: "Translator" },
  "u_ai": { ko: "AI 도우미", en: "AI Helper" },
  "u_share": { ko: "스케줄 공유", en: "Share" },
  "u_video": { ko: "영상 통화", en: "Video Call" },
  "u_passport": { ko: "여권 관리", en: "Passport" },
  "u_guide": { ko: "출입국 가이드", en: "Guide" },
  "u_baggage": { ko: "수화물 추적", en: "Baggage" },

  // ── 관계자(organizer) 아이콘 ──
  "o_attendees": { ko: "참석자 관리", en: "Attendees" },
  "o_flights": { ko: "항공 예약", en: "Flights" },
  "o_hotels": { ko: "호텔 예약", en: "Hotels" },
  "o_schedule": { ko: "일정 관리", en: "Schedule" },
  "o_rail": { ko: "철도 예약", en: "Rail" },
  "o_vehicle": { ko: "차량 배치", en: "Vehicles" },
  "o_announce": { ko: "공지 관리", en: "Announce" },
  "o_comms": { ko: "소통 채널", en: "Comms" },
  "o_translator": { ko: "통역 요청", en: "Translator" },
  "o_memo": { ko: "메모", en: "Memo" },
  "o_catering": { ko: "케이터링", en: "Catering" },
  "o_report": { ko: "리포트", en: "Report" },
  "o_settlement": { ko: "정산", en: "Settlement" },
  "o_map": { ko: "지도", en: "Map" },
  "o_ai": { ko: "AI 도우미", en: "AI Helper" },
  "o_immigration": { ko: "출입국 가이드", en: "Immigration" },

  // ── 비로그인 아이콘 ──
  "g_apply": { ko: "밋업 신청", en: "Apply" },
  "g_lookup": { ko: "여정표 조회", en: "Lookup" },
  "g_schedule": { ko: "일정 확인", en: "Schedule" },
  "g_community": { ko: "커뮤니티", en: "Community" },
  "g_ride": { ko: "차량 호출", en: "Ride" },
  "g_delivery": { ko: "음식 배달", en: "Delivery" },
  "g_ai": { ko: "AI 도우미", en: "AI Helper" },
  "g_map": { ko: "지도", en: "Map" },

  // ── 카테고리 라벨 ──
  "cat_guest_main": { ko: "서비스 체험", en: "Try Services" },
  "cat_guest_more": { ko: "더 알아보기", en: "Explore More" },
  "cat_org_core": { ko: "참석자/예약 관리", en: "Attendee & Booking" },
  "cat_org_ops": { ko: "운영 지원", en: "Operations" },
  "cat_org_extra": { ko: "부가 기능", en: "Additional" },
  "cat_user_core": { ko: "출장 핵심", en: "Trip Essentials" },
  "cat_user_onsite": { ko: "현장 서비스", en: "On-site Services" },
  "cat_user_extra": { ko: "편의 기능", en: "Utilities" },

  // ── 서비스 메뉴 리스트 ──
  "svc_guest_title": { ko: "서비스 둘러보기", en: "Explore Services" },
  "svc_guest_desc": { ko: "로그인 없이 체험해보세요", en: "Try without login" },
  "svc_org_manage_title": { ko: "참석자/예약 관리", en: "Attendee & Booking" },
  "svc_org_manage_desc": { ko: "초청 인원과 예약을 한눈에", en: "Manage invitees & bookings" },
  "svc_org_ops_title": { ko: "운영 도구", en: "Operations" },
  "svc_org_ops_desc": { ko: "차량, 소통, 공지를 관리", en: "Vehicles, comms & announcements" },
  "svc_user_trip_title": { ko: "출장 관리", en: "Trip Management" },
  "svc_user_trip_desc": { ko: "신청부터 일정까지 한 곳에서", en: "Apply to schedule in one place" },
  "svc_user_onsite_title": { ko: "현장 서비스", en: "On-site Services" },
  "svc_user_onsite_desc": { ko: "도착 후 필요한 모든 것", en: "Everything after arrival" },
  "svc_user_util_title": { ko: "편의 도구", en: "Utilities" },
  "svc_user_util_desc": { ko: "메모, 통역, AI 도우미", en: "Memo, translator, AI helper" },

  // ── 기타 ──
  "footer_desc": { ko: "글로벌 밋업 & 출장 관리 플랫폼", en: "Global Meetup & Business Trip Platform" },
  "ad_travel_title": { ko: "꿈의 여행지를 찾아보세요", en: "Discover your dream destination" },
};

const localeDir = 'client/src/locales';
const files = ['ko', 'en'];

for (const lang of files) {
  const filePath = `${localeDir}/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!data.home) data.home = {};
  
  let added = 0;
  for (const [key, vals] of Object.entries(newHomeKeys)) {
    if (!data.home[key]) {
      data.home[key] = vals[lang] || vals.en;
      added++;
    }
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`${lang}.json: added ${added} new home keys`);
}

console.log('Done!');
