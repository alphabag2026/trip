// ── Demo Travel Data Generator ──────────────────────────────────
// Generates realistic hotel and flight search results for demo mode
// Will be replaced with real Amadeus/Qunar API calls when API keys are configured

interface DemoHotel {
  id: string;
  name: string;
  nameLocal: string;
  stars: number;
  rating: number;
  reviewCount: number;
  address: string;
  imageUrl: string;
  amenities: string[];
  localPrice: number;
  localCurrency: string;
  usdPrice: number;
  usdtPrice: number;
  vatAmount: number;
  savings: number;
  savingsPercent: number;
  roomType: string;
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  distanceFromCenter: string;
  checkIn: string;
  checkOut: string;
  nights: number;
}

interface DemoFlight {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  stopCities: string[];
  cabinClass: string;
  localPrice: number;
  localCurrency: string;
  usdPrice: number;
  usdtPrice: number;
  vatAmount: number;
  savings: number;
  savingsPercent: number;
  baggageIncluded: string;
  aircraft: string;
  imageUrl: string;
}

// Hotel image URLs (CDN-hosted stock images)
const HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&h=500&fit=crop',
];

const AIRLINE_LOGOS: Record<string, string> = {
  'KE': 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=200&h=120&fit=crop',
  'OZ': 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=200&h=120&fit=crop',
  'SQ': 'https://images.unsplash.com/photo-1540339832862-474599807836?w=200&h=120&fit=crop',
  'CX': 'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=200&h=120&fit=crop',
  'TG': 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=200&h=120&fit=crop',
  'JL': 'https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=200&h=120&fit=crop',
};

// Destination-specific hotel data
const HOTEL_DATA: Record<string, Array<{ name: string; nameLocal: string; stars: number; address: string; distanceFromCenter: string }>> = {
  'Bangkok': [
    { name: 'Mandarin Oriental Bangkok', nameLocal: 'โรงแรมแมนดาริน โอเรียนเต็ล กรุงเทพ', stars: 5, address: '48 Oriental Avenue, Bang Rak', distanceFromCenter: '2.1 km' },
    { name: 'The Peninsula Bangkok', nameLocal: 'เดอะ เพนนินซูลา กรุงเทพ', stars: 5, address: '333 Charoennakorn Rd', distanceFromCenter: '3.5 km' },
    { name: 'Shangri-La Bangkok', nameLocal: 'แชงกรี-ลา กรุงเทพ', stars: 5, address: '89 Soi Wat Suan Plu', distanceFromCenter: '4.2 km' },
    { name: 'Centara Grand at CentralWorld', nameLocal: 'เซ็นทารา แกรนด์ แอท เซ็นทรัลเวิลด์', stars: 5, address: '999/99 Rama 1 Rd', distanceFromCenter: '0.5 km' },
    { name: 'Novotel Bangkok Sukhumvit 20', nameLocal: 'โนโวเทล กรุงเทพ สุขุมวิท 20', stars: 4, address: '19/9 Sukhumvit Soi 20', distanceFromCenter: '5.8 km' },
    { name: 'Ibis Styles Bangkok Khaosan', nameLocal: 'ไอบิส สไตล์ กรุงเทพ ข้าวสาร', stars: 3, address: '265 Khaosan Rd', distanceFromCenter: '6.2 km' },
    { name: 'Amari Watergate Bangkok', nameLocal: 'อมารี วอเตอร์เกท กรุงเทพ', stars: 5, address: '847 Petchburi Rd', distanceFromCenter: '1.8 km' },
    { name: 'Holiday Inn Express Bangkok Siam', nameLocal: 'ฮอลิเดย์ อินน์ เอ็กซ์เพรส กรุงเทพ สยาม', stars: 3, address: '989 Siam Square Soi 2', distanceFromCenter: '0.3 km' },
  ],
  'Tokyo': [
    { name: 'The Ritz-Carlton Tokyo', nameLocal: 'ザ・リッツ・カールトン東京', stars: 5, address: '9-7-1 Akasaka, Minato-ku', distanceFromCenter: '3.2 km' },
    { name: 'Park Hyatt Tokyo', nameLocal: 'パーク ハイアット 東京', stars: 5, address: '3-7-1-2 Nishi-Shinjuku', distanceFromCenter: '5.1 km' },
    { name: 'Aman Tokyo', nameLocal: 'アマン東京', stars: 5, address: '1-5-6 Otemachi, Chiyoda-ku', distanceFromCenter: '1.0 km' },
    { name: 'Hotel Gracery Shinjuku', nameLocal: 'ホテルグレイスリー新宿', stars: 4, address: '1-19-1 Kabukicho, Shinjuku', distanceFromCenter: '4.8 km' },
    { name: 'Dormy Inn Premium Shibuya', nameLocal: 'ドーミーインPREMIUM渋谷', stars: 3, address: '1-1-1 Dogenzaka, Shibuya', distanceFromCenter: '6.5 km' },
    { name: 'Shinjuku Granbell Hotel', nameLocal: '新宿グランベルホテル', stars: 4, address: '2-14-5 Kabukicho, Shinjuku', distanceFromCenter: '4.5 km' },
    { name: 'APA Hotel Ginza Kyobashi', nameLocal: 'アパホテル銀座京橋', stars: 3, address: '3-12-7 Kyobashi, Chuo-ku', distanceFromCenter: '2.0 km' },
    { name: 'Conrad Tokyo', nameLocal: 'コンラッド東京', stars: 5, address: '1-9-1 Higashi-Shinbashi', distanceFromCenter: '2.8 km' },
  ],
  'Seoul': [
    { name: 'The Shilla Seoul', nameLocal: '서울신라호텔', stars: 5, address: '249 Dongho-ro, Jung-gu', distanceFromCenter: '3.0 km' },
    { name: 'Lotte Hotel Seoul', nameLocal: '롯데호텔 서울', stars: 5, address: '30 Eulji-ro, Jung-gu', distanceFromCenter: '0.5 km' },
    { name: 'Four Seasons Hotel Seoul', nameLocal: '포시즌스 호텔 서울', stars: 5, address: '97 Saemunan-ro, Jongno-gu', distanceFromCenter: '1.2 km' },
    { name: 'Signiel Seoul', nameLocal: '시그니엘 서울', stars: 5, address: '300 Olympic-ro, Songpa-gu', distanceFromCenter: '12.0 km' },
    { name: 'Ibis Styles Ambassador Seoul Myeongdong', nameLocal: '이비스 스타일 앰배서더 서울 명동', stars: 3, address: '31 Samil-daero 10-gil', distanceFromCenter: '0.8 km' },
    { name: 'L7 Hongdae by LOTTE', nameLocal: 'L7 홍대 바이 롯데', stars: 4, address: '141 Yanghwa-ro, Mapo-gu', distanceFromCenter: '6.5 km' },
    { name: 'Nine Tree Premier Hotel Myeongdong', nameLocal: '나인트리 프리미어 호텔 명동', stars: 4, address: '51 Myeongdong 8-gil', distanceFromCenter: '0.3 km' },
    { name: 'Grand Hyatt Seoul', nameLocal: '그랜드 하얏트 서울', stars: 5, address: '322 Sowol-ro, Yongsan-gu', distanceFromCenter: '4.5 km' },
  ],
  'Singapore': [
    { name: 'Marina Bay Sands', nameLocal: 'Marina Bay Sands', stars: 5, address: '10 Bayfront Avenue', distanceFromCenter: '1.5 km' },
    { name: 'Raffles Hotel Singapore', nameLocal: 'Raffles Hotel Singapore', stars: 5, address: '1 Beach Road', distanceFromCenter: '0.8 km' },
    { name: 'The Fullerton Hotel', nameLocal: 'The Fullerton Hotel', stars: 5, address: '1 Fullerton Square', distanceFromCenter: '0.5 km' },
    { name: 'Capella Singapore', nameLocal: 'Capella Singapore', stars: 5, address: '1 The Knolls, Sentosa Island', distanceFromCenter: '8.0 km' },
    { name: 'YOTEL Singapore Orchard Road', nameLocal: 'YOTEL Singapore', stars: 4, address: '366 Orchard Road', distanceFromCenter: '2.5 km' },
    { name: 'Hotel G Singapore', nameLocal: 'Hotel G Singapore', stars: 3, address: '200 Middle Road', distanceFromCenter: '1.0 km' },
    { name: 'Pan Pacific Singapore', nameLocal: 'Pan Pacific Singapore', stars: 5, address: '7 Raffles Blvd', distanceFromCenter: '1.2 km' },
    { name: 'Parkroyal Collection Marina Bay', nameLocal: 'Parkroyal Collection', stars: 5, address: '6 Raffles Blvd', distanceFromCenter: '1.3 km' },
  ],
  'default': [
    { name: 'Grand International Hotel', nameLocal: 'Grand International Hotel', stars: 5, address: 'City Center', distanceFromCenter: '1.0 km' },
    { name: 'Luxury Palace Resort', nameLocal: 'Luxury Palace Resort', stars: 5, address: 'Beach Road', distanceFromCenter: '3.5 km' },
    { name: 'City Center Suites', nameLocal: 'City Center Suites', stars: 4, address: 'Main Street', distanceFromCenter: '0.5 km' },
    { name: 'Business Travel Inn', nameLocal: 'Business Travel Inn', stars: 3, address: 'Commerce District', distanceFromCenter: '2.0 km' },
    { name: 'Budget Express Hotel', nameLocal: 'Budget Express Hotel', stars: 3, address: 'Transit Area', distanceFromCenter: '5.0 km' },
    { name: 'Premium Boutique Hotel', nameLocal: 'Premium Boutique Hotel', stars: 4, address: 'Arts Quarter', distanceFromCenter: '1.8 km' },
    { name: 'Seaside Resort & Spa', nameLocal: 'Seaside Resort & Spa', stars: 5, address: 'Coastal Road', distanceFromCenter: '7.0 km' },
    { name: 'Downtown Comfort Lodge', nameLocal: 'Downtown Comfort Lodge', stars: 3, address: 'Downtown', distanceFromCenter: '0.3 km' },
  ],
};

// Base prices per star rating (in USD per night)
const BASE_PRICES_USD: Record<number, [number, number]> = {
  3: [45, 90],
  4: [90, 200],
  5: [200, 600],
};

const ROOM_TYPES = ['Standard Room', 'Superior Room', 'Deluxe Room', 'Suite', 'Executive Suite'];
const AMENITIES_POOL = ['Free WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Room Service', 'Parking', 'Airport Shuttle', 'Business Center', 'Laundry', 'Concierge'];

// Airlines data
const AIRLINES: Array<{ name: string; code: string; country: string }> = [
  { name: 'Korean Air', code: 'KE', country: 'KR' },
  { name: 'Asiana Airlines', code: 'OZ', country: 'KR' },
  { name: 'Singapore Airlines', code: 'SQ', country: 'SG' },
  { name: 'Cathay Pacific', code: 'CX', country: 'HK' },
  { name: 'Thai Airways', code: 'TG', country: 'TH' },
  { name: 'Japan Airlines', code: 'JL', country: 'JP' },
  { name: 'ANA', code: 'NH', country: 'JP' },
  { name: 'Emirates', code: 'EK', country: 'AE' },
  { name: 'Air China', code: 'CA', country: 'CN' },
  { name: 'Vietnam Airlines', code: 'VN', country: 'VN' },
];

const AIRCRAFT_TYPES = ['Boeing 777-300ER', 'Airbus A350-900', 'Boeing 787-9', 'Airbus A380', 'Boeing 737-800', 'Airbus A321neo'];

// Cabin class price multipliers
const CABIN_MULTIPLIERS: Record<string, number> = {
  'economy': 1,
  'premium_economy': 1.8,
  'business': 3.5,
  'first': 6,
};

// Route base prices (USD, economy)
const ROUTE_PRICES: Record<string, number> = {
  'ICN-BKK': 280, 'ICN-NRT': 250, 'ICN-SIN': 350, 'ICN-HKG': 300,
  'ICN-PVG': 200, 'ICN-HND': 260, 'ICN-KIX': 220, 'ICN-TPE': 230,
  'ICN-MNL': 280, 'ICN-SGN': 320, 'ICN-HAN': 300, 'ICN-DPS': 400,
  'ICN-KUL': 330, 'ICN-DEL': 450, 'ICN-SYD': 650, 'ICN-LAX': 750,
  'ICN-JFK': 800, 'ICN-LHR': 700, 'ICN-CDG': 680, 'ICN-FRA': 670,
  'NRT-BKK': 350, 'NRT-SIN': 400, 'HKG-BKK': 200, 'SIN-BKK': 150,
};

// Duration estimates (hours)
const ROUTE_DURATIONS: Record<string, [number, number]> = {
  'ICN-BKK': [5, 6], 'ICN-NRT': [2, 3], 'ICN-SIN': [6, 7], 'ICN-HKG': [3, 4],
  'ICN-PVG': [2, 3], 'ICN-HND': [2, 3], 'ICN-KIX': [2, 2.5], 'ICN-TPE': [2.5, 3],
  'ICN-MNL': [4, 5], 'ICN-SGN': [5, 6], 'ICN-HAN': [4.5, 5.5], 'ICN-DPS': [7, 8],
  'ICN-KUL': [6, 7], 'ICN-DEL': [7, 8], 'ICN-SYD': [10, 11], 'ICN-LAX': [11, 12],
  'ICN-JFK': [14, 15], 'ICN-LHR': [12, 13], 'ICN-CDG': [12, 13], 'ICN-FRA': [11, 12],
};

// Seeded random number generator for consistent results
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

function calculateNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

export function generateDemoHotels(
  destination: string,
  countryCode: string,
  currency: string,
  exchangeRate: number,
  vatRate: number,
  checkIn: string,
  checkOut: string,
): DemoHotel[] {
  const rng = seededRandom(`${destination}-${checkIn}-${checkOut}`);
  const nights = calculateNights(checkIn, checkOut);
  
  // Find matching hotel data
  const hotelList = HOTEL_DATA[destination] || HOTEL_DATA['default'];
  const EXCHANGE_FEE_RATE = 0.0185;
  const PLATFORM_MARGIN_RATE = 0.03;

  return hotelList.map((hotel, idx) => {
    const [minPrice, maxPrice] = BASE_PRICES_USD[hotel.stars] || [50, 150];
    const baseUsdPerNight = minPrice + (maxPrice - minPrice) * rng();
    const totalUsd = baseUsdPerNight * nights;
    
    // Local price = USD * exchangeRate * (1 + VAT)
    const localPriceExVat = totalUsd * exchangeRate;
    const localPrice = Math.round(localPriceExVat * (1 + vatRate));
    
    // USDT calculation (our business model - no VAT)
    const priceExVat = localPrice / (1 + vatRate);
    const usdPriceExVat = priceExVat / exchangeRate;
    const exchangeFee = usdPriceExVat * EXCHANGE_FEE_RATE;
    const platformMargin = usdPriceExVat * PLATFORM_MARGIN_RATE;
    const usdtPrice = usdPriceExVat + exchangeFee + platformMargin;
    
    const localPriceInUsd = localPrice / exchangeRate;
    const savings = localPriceInUsd - usdtPrice;
    const savingsPercent = (savings / localPriceInUsd) * 100;

    // Random amenities
    const amenityCount = 4 + Math.floor(rng() * 5);
    const shuffled = [...AMENITIES_POOL].sort(() => rng() - 0.5);
    const amenities = shuffled.slice(0, amenityCount);

    const roomTypeIdx = Math.min(hotel.stars - 2, ROOM_TYPES.length - 1);
    const roomType = ROOM_TYPES[Math.max(0, roomTypeIdx + Math.floor(rng() * 2) - 1)];

    return {
      id: `hotel-${countryCode}-${idx}-${checkIn}`,
      name: hotel.name,
      nameLocal: hotel.nameLocal,
      stars: hotel.stars,
      rating: Math.round((3.5 + rng() * 1.5) * 10) / 10,
      reviewCount: Math.floor(200 + rng() * 3000),
      address: hotel.address,
      imageUrl: HOTEL_IMAGES[idx % HOTEL_IMAGES.length],
      amenities,
      localPrice,
      localCurrency: currency,
      usdPrice: Math.round(localPriceInUsd * 100) / 100,
      usdtPrice: Math.round(usdtPrice * 100) / 100,
      vatAmount: Math.round((localPriceInUsd - usdPriceExVat) * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      savingsPercent: Math.round(savingsPercent * 100) / 100,
      roomType,
      freeCancellation: rng() > 0.3,
      breakfastIncluded: rng() > 0.5,
      distanceFromCenter: hotel.distanceFromCenter,
      checkIn,
      checkOut,
      nights,
    };
  }).sort((a, b) => a.usdtPrice - b.usdtPrice);
}

export function generateDemoFlights(
  origin: string,
  destination: string,
  currency: string,
  exchangeRate: number,
  vatRate: number,
  departDate: string,
  cabinClass: string,
): DemoFlight[] {
  const rng = seededRandom(`${origin}-${destination}-${departDate}-${cabinClass}`);
  const routeKey = `${origin}-${destination}`;
  const reverseKey = `${destination}-${origin}`;
  const basePrice = ROUTE_PRICES[routeKey] || ROUTE_PRICES[reverseKey] || 400;
  const durationRange = ROUTE_DURATIONS[routeKey] || ROUTE_DURATIONS[reverseKey] || [4, 8];
  const cabinMultiplier = CABIN_MULTIPLIERS[cabinClass] || 1;
  
  const EXCHANGE_FEE_RATE = 0.0185;
  const PLATFORM_MARGIN_RATE = 0.03;

  // Generate 6-8 flight options
  const flightCount = 6 + Math.floor(rng() * 3);
  const flights: DemoFlight[] = [];

  for (let i = 0; i < flightCount; i++) {
    const airline = AIRLINES[Math.floor(rng() * AIRLINES.length)];
    const flightNum = `${airline.code}${100 + Math.floor(rng() * 900)}`;
    
    // Price variation ±30%
    const priceVariation = 0.7 + rng() * 0.6;
    const usdPrice = Math.round(basePrice * cabinMultiplier * priceVariation);
    
    // Local price with VAT
    const localPriceExVat = usdPrice * exchangeRate;
    const localPrice = Math.round(localPriceExVat * (1 + vatRate));
    
    // USDT calculation
    const priceExVat = localPrice / (1 + vatRate);
    const usdPriceExVat = priceExVat / exchangeRate;
    const exchangeFee = usdPriceExVat * EXCHANGE_FEE_RATE;
    const platformMargin = usdPriceExVat * PLATFORM_MARGIN_RATE;
    const usdtPrice = usdPriceExVat + exchangeFee + platformMargin;
    
    const localPriceInUsd = localPrice / exchangeRate;
    const savings = localPriceInUsd - usdtPrice;
    const savingsPercent = (savings / localPriceInUsd) * 100;

    // Departure time (6am - 11pm)
    const depHour = 6 + Math.floor(rng() * 17);
    const depMin = Math.floor(rng() * 4) * 15;
    const depTime = `${departDate}T${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}:00`;
    
    // Duration
    const baseDuration = durationRange[0] + (durationRange[1] - durationRange[0]) * rng();
    const stops = rng() > 0.6 ? 0 : rng() > 0.5 ? 1 : 2;
    const totalDuration = baseDuration + stops * 1.5;
    const durationHours = Math.floor(totalDuration);
    const durationMins = Math.round((totalDuration - durationHours) * 60);
    
    const arrDate = new Date(depTime);
    arrDate.setHours(arrDate.getHours() + durationHours);
    arrDate.setMinutes(arrDate.getMinutes() + durationMins);
    
    const stopCities: string[] = [];
    if (stops > 0) {
      const transitCities = ['Taipei', 'Hong Kong', 'Shanghai', 'Hanoi', 'Manila', 'Kuala Lumpur'];
      for (let s = 0; s < stops; s++) {
        stopCities.push(transitCities[Math.floor(rng() * transitCities.length)]);
      }
    }

    const baggageOptions = ['23kg x 1', '23kg x 2', '30kg x 1', '20kg x 1'];
    const baggageIdx = cabinClass === 'economy' ? Math.floor(rng() * 2) : cabinClass === 'business' ? 2 : 1;

    flights.push({
      id: `flight-${flightNum}-${departDate}`,
      airline: airline.name,
      airlineCode: airline.code,
      flightNumber: flightNum,
      origin: origin,
      originCode: origin,
      destination: destination,
      destinationCode: destination,
      departureTime: depTime,
      arrivalTime: arrDate.toISOString(),
      duration: `${durationHours}h ${durationMins}m`,
      stops,
      stopCities,
      cabinClass,
      localPrice,
      localCurrency: currency,
      usdPrice: Math.round(localPriceInUsd * 100) / 100,
      usdtPrice: Math.round(usdtPrice * 100) / 100,
      vatAmount: Math.round((localPriceInUsd - usdPriceExVat) * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      savingsPercent: Math.round(savingsPercent * 100) / 100,
      baggageIncluded: baggageOptions[baggageIdx],
      aircraft: AIRCRAFT_TYPES[Math.floor(rng() * AIRCRAFT_TYPES.length)],
      imageUrl: AIRLINE_LOGOS[airline.code] || AIRLINE_LOGOS['KE'],
    });
  }

  return flights.sort((a, b) => a.usdtPrice - b.usdtPrice);
}
