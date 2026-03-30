import fs from "fs";
const KO_PATH = "client/src/locales/ko.json";
const EN_PATH = "client/src/locales/en.json";

const koKeys = {
  "home.platform_title": "Alpha Trip이란?",
  "home.platform_desc": "Alpha Trip은 글로벌 밋업과 비즈니스 출장을 하나의 플랫폼에서 관리하는 올인원 서비스입니다. 밋업 신청부터 항공권·호텔 예약, 현장 차량 호출, 음식 배달, 실시간 통역까지 — 출장의 모든 과정을 Alpha Trip 하나로 해결하세요.",
  "home.platform_desc2": "주최자, 에이전시, 파트너, 기사, 통역사 등 각 역할에 맞는 전용 대시보드를 제공하여 효율적인 협업이 가능합니다. USDT 결제를 지원하며, 19개 언어 실시간 번역과 AI 챗봇으로 언어 장벽 없는 글로벌 비즈니스를 경험하세요.",
  "home.features_title": "주요 기능",
  "home.feat1_title": "밋업 신청 & 관리",
  "home.feat1_desc": "밋업에 간편하게 신청하고, 승인 후 팀 스케줄이 자동으로 등록됩니다. 팀원 합류 시 실시간 알림을 받아 빠르게 소통할 수 있습니다.",
  "home.feat2_title": "항공권 · 호텔 · 교통편",
  "home.feat2_desc": "항공권, 철도, 고속버스, 호텔을 한 곳에서 검색하고 예약하세요. 배정된 교통편과 숙소 정보를 실시간으로 확인할 수 있습니다.",
  "home.feat3_title": "현장 차량 호출 & 음식 배달",
  "home.feat3_desc": "행사장 도착 후 전용 차량 호출과 음식 배달 서비스를 이용하세요. 기사님 전용 대시보드로 실시간 배차 현황을 관리합니다.",
  "home.feat4_title": "실시간 통역 & 메모",
  "home.feat4_desc": "19개 언어 AI 실시간 번역과 음성 인식 통역 기능으로 언어 장벽을 허물어보세요. 출장 중 중요한 내용은 메모 기능으로 바로 기록하세요.",
  "home.feat5_title": "팀 스케줄 & 소통",
  "home.feat5_desc": "팀원들과 모임 장소·시간을 캘린더로 공유하고, 팀 공지와 실시간 채팅으로 원활하게 소통하세요. 밋업 신청 시 팀 스케줄이 자동으로 등록됩니다.",
  "home.feat6_title": "역할별 전용 대시보드",
  "home.feat6_desc": "참석자, 주최자, 기사, 통역사, 에이전시, 파트너 등 각 역할에 최적화된 전용 화면을 제공합니다. 필요한 정보만 한눈에 확인하세요."
};

const enKeys = {
  "home.platform_title": "What is Alpha Trip?",
  "home.platform_desc": "Alpha Trip is an all-in-one platform for managing global meetups and business trips. From meetup registration to flight & hotel booking, on-site vehicle dispatch, food delivery, and real-time translation — handle every aspect of your business trip with Alpha Trip.",
  "home.platform_desc2": "We provide role-specific dashboards for organizers, agencies, partners, drivers, interpreters, and more for efficient collaboration. With USDT payment support, 19-language real-time translation, and AI chatbot, experience global business without language barriers.",
  "home.features_title": "Key Features",
  "home.feat1_title": "Meetup Registration & Management",
  "home.feat1_desc": "Easily register for meetups, and team schedules are automatically created upon approval. Get real-time notifications when team members join for quick communication.",
  "home.feat2_title": "Flights · Hotels · Transport",
  "home.feat2_desc": "Search and book flights, trains, express buses, and hotels in one place. Check your assigned transport and accommodation details in real-time.",
  "home.feat3_title": "On-site Vehicle & Food Delivery",
  "home.feat3_desc": "Use dedicated vehicle dispatch and food delivery services after arriving at the venue. Drivers manage real-time dispatch status through their dedicated dashboard.",
  "home.feat4_title": "Real-time Translation & Notes",
  "home.feat4_desc": "Break language barriers with AI real-time translation in 19 languages and voice recognition. Record important notes instantly during your trip with the memo feature.",
  "home.feat5_title": "Team Schedule & Communication",
  "home.feat5_desc": "Share meeting locations and times via calendar with team members, and communicate smoothly through team announcements and real-time chat. Team schedules are auto-created when registering for meetups.",
  "home.feat6_title": "Role-based Dashboards",
  "home.feat6_desc": "Optimized dedicated screens for each role — attendees, organizers, drivers, interpreters, agencies, and partners. See only the information you need at a glance."
};

function addKeys(filePath, keys) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  let added = 0;
  for (const [k, v] of Object.entries(keys)) {
    if (!data[k]) { data[k] = v; added++; }
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  console.log(`${filePath}: ${added} keys added`);
}

addKeys(KO_PATH, koKeys);
addKeys(EN_PATH, enKeys);
console.log("Done!");
