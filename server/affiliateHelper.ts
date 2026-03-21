/**
 * Affiliate URL Builder - Trip.com, Booking.com, Agoda, Skyscanner, Klook, Travelpayouts
 * 
 * 각 플랫폼의 어필리에이트 딥링크를 생성하는 헬퍼
 */

export interface FlightSearchParams {
  origin: string;       // IATA code (ICN)
  destination: string;  // IATA code (BKK)
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  passengers?: number;
  cabinClass?: "economy" | "premium_economy" | "business" | "first";
}

export interface HotelSearchParams {
  city: string;
  checkIn: string;  // YYYY-MM-DD
  checkOut: string;
  rooms?: number;
  guests?: number;
}

export interface AffiliateConfig {
  tripComAffId?: string;
  bookingComAffId?: string;
  agodaCid?: string;
  skyscannerAffId?: string;
  klookAffId?: string;
  travelpayoutsMarker?: string;
}

// ── Trip.com 딥링크 ──────────────────────────────────────
export function buildTripComFlightUrl(params: FlightSearchParams, affId?: string): string {
  const base = "https://www.trip.com/flights";
  const route = `${params.origin}-${params.destination}`;
  const dates = params.returnDate
    ? `?dcity=${params.origin}&acity=${params.destination}&ddate=${params.departureDate}&rdate=${params.returnDate}&flighttype=rt`
    : `?dcity=${params.origin}&acity=${params.destination}&ddate=${params.departureDate}&flighttype=ow`;
  const cabin = params.cabinClass === "business" ? "&class=c" : params.cabinClass === "first" ? "&class=f" : "&class=y";
  const pax = `&adult=${params.passengers || 1}`;
  const aff = affId ? `&aid=${affId}` : "";
  return `${base}/${route}${dates}${cabin}${pax}${aff}`;
}

export function buildTripComHotelUrl(params: HotelSearchParams, affId?: string): string {
  const base = "https://www.trip.com/hotels/list";
  const query = `?city=${encodeURIComponent(params.city)}&checkin=${params.checkIn}&checkout=${params.checkOut}&rooms=${params.rooms || 1}&adult=${params.guests || 2}`;
  const aff = affId ? `&aid=${affId}` : "";
  return `${base}${query}${aff}`;
}

// ── Booking.com 딥링크 ──────────────────────────────────────
export function buildBookingComHotelUrl(params: HotelSearchParams, affId?: string): string {
  const base = "https://www.booking.com/searchresults.html";
  const query = `?ss=${encodeURIComponent(params.city)}&checkin=${params.checkIn}&checkout=${params.checkOut}&no_rooms=${params.rooms || 1}&group_adults=${params.guests || 2}`;
  const aff = affId ? `&aid=${affId}` : "";
  return `${base}${query}${aff}`;
}

// ── Agoda 딥링크 ──────────────────────────────────────────
export function buildAgodaHotelUrl(params: HotelSearchParams, cid?: string): string {
  const base = "https://www.agoda.com/search";
  const query = `?city=${encodeURIComponent(params.city)}&checkIn=${params.checkIn}&los=${calculateNights(params.checkIn, params.checkOut)}&rooms=${params.rooms || 1}&adults=${params.guests || 2}`;
  const aff = cid ? `&cid=${cid}` : "";
  return `${base}${query}${aff}`;
}

// ── Skyscanner 딥링크 ──────────────────────────────────────
export function buildSkyscannerFlightUrl(params: FlightSearchParams, affId?: string): string {
  const depDate = params.departureDate.replace(/-/g, "").slice(2); // YYMMDD
  const retDate = params.returnDate ? params.returnDate.replace(/-/g, "").slice(2) : "";
  const route = retDate
    ? `${params.origin}/${params.destination}/${depDate}/${retDate}/`
    : `${params.origin}/${params.destination}/${depDate}/`;
  const cabin = params.cabinClass === "business" ? "business" : params.cabinClass === "first" ? "first" : "economy";
  const base = `https://www.skyscanner.net/transport/flights/${route}?adultsv2=${params.passengers || 1}&cabinclass=${cabin}`;
  const aff = affId ? `&associateId=${affId}` : "";
  return `${base}${aff}`;
}

// ── Klook 딥링크 ──────────────────────────────────────────
export function buildKlookTourUrl(city: string, affId?: string): string {
  const base = `https://www.klook.com/search/result/?query=${encodeURIComponent(city)}`;
  const aff = affId ? `&aid=${affId}` : "";
  return `${base}${aff}`;
}

// ── Travelpayouts 통합 딥링크 ──────────────────────────────
export function buildTravelpayoutsFlightUrl(params: FlightSearchParams, marker?: string): string {
  const base = "https://www.aviasales.com/search";
  const route = `${params.origin}${params.departureDate.replace(/-/g, "")}${params.destination}`;
  const ret = params.returnDate ? params.returnDate.replace(/-/g, "") : "";
  const query = ret ? `/${route}${ret}1` : `/${route}1`;
  const aff = marker ? `?marker=${marker}` : "";
  return `${base}${query}${aff}`;
}

export function buildTravelpayoutsHotelUrl(params: HotelSearchParams, marker?: string): string {
  const base = "https://search.hotellook.com";
  const query = `?destination=${encodeURIComponent(params.city)}&checkIn=${params.checkIn}&checkOut=${params.checkOut}&rooms=${params.rooms || 1}&adults=${params.guests || 2}`;
  const aff = marker ? `&marker=${marker}` : "";
  return `${base}${query}${aff}`;
}

// ── 통합 검색 결과 생성 ──────────────────────────────────────
export interface PlatformResult {
  platform: string;
  platformName: string;
  url: string;
  estimatedPrice?: string;
  currency: string;
  features: string[];
  logoColor: string;
}

export function generateFlightSearchLinks(params: FlightSearchParams, config: AffiliateConfig): PlatformResult[] {
  const results: PlatformResult[] = [];

  // Trip.com
  results.push({
    platform: "trip_com",
    platformName: "Trip.com",
    url: buildTripComFlightUrl(params, config.tripComAffId),
    currency: "USD",
    features: ["항공+호텔 패키지", "24시간 고객지원", "가격 보장"],
    logoColor: "#287DFA",
  });

  // Skyscanner
  results.push({
    platform: "skyscanner",
    platformName: "Skyscanner",
    url: buildSkyscannerFlightUrl(params, config.skyscannerAffId),
    currency: "USD",
    features: ["최저가 비교", "가격 알림", "유연한 날짜 검색"],
    logoColor: "#0770E3",
  });

  // Travelpayouts (Aviasales)
  if (config.travelpayoutsMarker) {
    results.push({
      platform: "travelpayouts",
      platformName: "Aviasales",
      url: buildTravelpayoutsFlightUrl(params, config.travelpayoutsMarker),
      currency: "USD",
      features: ["200+ 항공사 비교", "숨은 요금 없음", "실시간 가격"],
      logoColor: "#FF6B00",
    });
  }

  return results;
}

export function generateHotelSearchLinks(params: HotelSearchParams, config: AffiliateConfig): PlatformResult[] {
  const results: PlatformResult[] = [];

  // Trip.com
  results.push({
    platform: "trip_com",
    platformName: "Trip.com",
    url: buildTripComHotelUrl(params, config.tripComAffId),
    currency: "USD",
    features: ["즉시 확정", "무료 취소", "가격 보장"],
    logoColor: "#287DFA",
  });

  // Booking.com
  results.push({
    platform: "booking_com",
    platformName: "Booking.com",
    url: buildBookingComHotelUrl(params, config.bookingComAffId),
    currency: "USD",
    features: ["28M+ 숙소", "무료 취소", "후불 결제"],
    logoColor: "#003580",
  });

  // Agoda
  results.push({
    platform: "agoda",
    platformName: "Agoda",
    url: buildAgodaHotelUrl(params, config.agodaCid),
    currency: "USD",
    features: ["아시아 특가", "시크릿 딜", "포인트 적립"],
    logoColor: "#5542F6",
  });

  // Travelpayouts (Hotellook)
  if (config.travelpayoutsMarker) {
    results.push({
      platform: "travelpayouts",
      platformName: "Hotellook",
      url: buildTravelpayoutsHotelUrl(params, config.travelpayoutsMarker),
      currency: "USD",
      features: ["70+ 사이트 비교", "최저가 보장", "실시간 가격"],
      logoColor: "#FF6B00",
    });
  }

  return results;
}

// ── 유틸리티 ──────────────────────────────────────────────
function calculateNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diff = d2.getTime() - d1.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// 공항 코드 → 도시명 매핑 (주요 공항)
export const AIRPORT_MAP: Record<string, { city: string; cityKo: string; country: string }> = {
  ICN: { city: "Seoul/Incheon", cityKo: "서울/인천", country: "KR" },
  GMP: { city: "Seoul/Gimpo", cityKo: "서울/김포", country: "KR" },
  PUS: { city: "Busan", cityKo: "부산", country: "KR" },
  CJU: { city: "Jeju", cityKo: "제주", country: "KR" },
  NRT: { city: "Tokyo/Narita", cityKo: "도쿄/나리타", country: "JP" },
  HND: { city: "Tokyo/Haneda", cityKo: "도쿄/하네다", country: "JP" },
  KIX: { city: "Osaka/Kansai", cityKo: "오사카/간사이", country: "JP" },
  BKK: { city: "Bangkok", cityKo: "방콕", country: "TH" },
  DMK: { city: "Bangkok/Don Mueang", cityKo: "방콕/돈무앙", country: "TH" },
  SIN: { city: "Singapore", cityKo: "싱가포르", country: "SG" },
  HKG: { city: "Hong Kong", cityKo: "홍콩", country: "HK" },
  TPE: { city: "Taipei", cityKo: "타이베이", country: "TW" },
  MNL: { city: "Manila", cityKo: "마닐라", country: "PH" },
  SGN: { city: "Ho Chi Minh", cityKo: "호치민", country: "VN" },
  HAN: { city: "Hanoi", cityKo: "하노이", country: "VN" },
  DPS: { city: "Bali/Denpasar", cityKo: "발리", country: "ID" },
  KUL: { city: "Kuala Lumpur", cityKo: "쿠알라룸푸르", country: "MY" },
  PNH: { city: "Phnom Penh", cityKo: "프놈펜", country: "KH" },
  REP: { city: "Siem Reap", cityKo: "시엠립", country: "KH" },
  RGN: { city: "Yangon", cityKo: "양곤", country: "MM" },
  LAX: { city: "Los Angeles", cityKo: "로스앤젤레스", country: "US" },
  JFK: { city: "New York/JFK", cityKo: "뉴욕/JFK", country: "US" },
  SFO: { city: "San Francisco", cityKo: "샌프란시스코", country: "US" },
  LHR: { city: "London/Heathrow", cityKo: "런던/히드로", country: "GB" },
  CDG: { city: "Paris/CDG", cityKo: "파리/CDG", country: "FR" },
  FRA: { city: "Frankfurt", cityKo: "프랑크푸르트", country: "DE" },
  DXB: { city: "Dubai", cityKo: "두바이", country: "AE" },
  SYD: { city: "Sydney", cityKo: "시드니", country: "AU" },
  PEK: { city: "Beijing", cityKo: "베이징", country: "CN" },
  PVG: { city: "Shanghai/Pudong", cityKo: "상하이/푸동", country: "CN" },
};

export function getAirportInfo(code: string) {
  return AIRPORT_MAP[code.toUpperCase()] || { city: code, cityKo: code, country: "??" };
}
