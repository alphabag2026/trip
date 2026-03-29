import fs from 'fs';

const newKeys = {
  // Driver menu keys
  "home.d_today_pickup": { ko: "오늘 배차", en: "Today's Pickup" },
  "home.d_route": { ko: "경로 안내", en: "Route Guide" },
  "home.d_schedule": { ko: "주간 스케줄", en: "Weekly Schedule" },
  "home.d_contact": { ko: "연락처", en: "Contacts" },
  "home.d_passengers": { ko: "탑승자 목록", en: "Passenger List" },
  "home.d_map": { ko: "지도", en: "Map" },
  "home.d_memo": { ko: "메모", en: "Memo" },
  "home.d_translator": { ko: "통역", en: "Translator" },
  "home.cat_driver_core": { ko: "오늘의 배차", en: "Today's Dispatch" },
  "home.cat_driver_support": { ko: "지원 도구", en: "Support Tools" },
  "home.svc_driver_pickup_title": { ko: "오늘의 픽업", en: "Today's Pickup" },
  "home.svc_driver_pickup_desc": { ko: "배정된 픽업 스케줄", en: "Assigned pickup schedule" },
  "home.svc_driver_support_title": { ko: "지원 도구", en: "Support Tools" },
  "home.svc_driver_support_desc": { ko: "지도, 메모, 통역", en: "Map, memo, translator" },
  "home.role_driver": { ko: "기사", en: "Driver" },

  // Interpreter menu keys
  "home.i_requests": { ko: "통역 요청", en: "Translation Requests" },
  "home.i_schedule": { ko: "오늘 일정", en: "Today's Schedule" },
  "home.i_team": { ko: "담당 팀", en: "Assigned Team" },
  "home.i_chat": { ko: "소통", en: "Communication" },
  "home.i_voice": { ko: "음성 통역", en: "Voice Translation" },
  "home.i_memo": { ko: "메모", en: "Memo" },
  "home.i_map": { ko: "지도", en: "Map" },
  "home.i_contact": { ko: "연락처", en: "Contacts" },
  "home.cat_interp_core": { ko: "통역 요청", en: "Translation Requests" },
  "home.cat_interp_support": { ko: "지원 도구", en: "Support Tools" },
  "home.svc_interp_request_title": { ko: "통역 요청", en: "Translation Requests" },
  "home.svc_interp_request_desc": { ko: "대기 중인 통역 요청", en: "Pending translation requests" },
  "home.svc_interp_support_title": { ko: "지원 도구", en: "Support Tools" },
  "home.svc_interp_support_desc": { ko: "메모, 지도, 연락", en: "Memo, map, contacts" },
  "home.role_interpreter": { ko: "통역사", en: "Interpreter" },

  // Voice translation keys
  "translator.voice_mode": { ko: "음성 모드", en: "Voice Mode" },
  "translator.listening": { ko: "듣는 중...", en: "Listening..." },
  "translator.tap_to_speak": { ko: "탭하여 말하기", en: "Tap to speak" },
  "translator.voice_not_supported": { ko: "음성 인식이 지원되지 않는 브라우저입니다", en: "Voice recognition not supported in this browser" },
  "translator.voice_error": { ko: "음성 인식 오류", en: "Voice recognition error" },
};

for (const lang of ['ko', 'en']) {
  const filePath = `client/src/locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  for (const [key, vals] of Object.entries(newKeys)) {
    const parts = key.split('.');
    let obj = data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    if (!obj[lastKey]) {
      obj[lastKey] = vals[lang];
    }
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

console.log('Done: driver/interpreter i18n keys added');
