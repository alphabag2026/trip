// Demo data generators for Ride-Hailing & Delivery services
// Will be replaced with real API calls (Karhoo, Lalamove, etc.) when configured

export interface DemoRideOption {
  id: string;
  provider: string;
  providerLogo: string;
  vehicleType: 'economy' | 'comfort' | 'premium' | 'van' | 'suv';
  vehicleName: string;
  vehicleIcon: string;
  capacity: number;
  estimatedMinutes: number;
  distanceKm: number;
  priceLocal: number;
  localCurrency: string;
  priceUsd: number;
  priceUsdt: number;
  vatAmount: number;
  vatSaved: number;
  savingsPercent: number;
  platformMarkup: number;
  surge: number; // 1.0 = no surge
  features: string[];
  rating: number;
  eta: number; // minutes until pickup
}

export interface DemoRestaurant {
  id: string;
  name: string;
  nameLocal: string;
  category: string;
  categoryIcon: string;
  rating: number;
  reviewCount: number;
  deliveryTime: number; // minutes
  deliveryFee: number;
  minOrder: number;
  imageUrl: string;
  priceRange: string; // $, $$, $$$
  distance: string;
  isOpen: boolean;
  isFeatured: boolean;
  tags: string[];
  menu: DemoMenuItem[];
}

export interface DemoMenuItem {
  id: string;
  name: string;
  nameLocal: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  isPopular: boolean;
  isSpicy: boolean;
  isVegetarian: boolean;
}

// ── City-specific ride data ──────────────────────────────
const CITY_RIDE_DATA: Record<string, {
  providers: string[];
  baseFare: Record<string, number>;
  perKm: Record<string, number>;
  currency: string;
  vehicles: { type: string; name: string; capacity: number; multiplier: number }[];
}> = {
  Bangkok: {
    providers: ['Grab', 'Bolt', 'InDrive', 'Cabb'],
    baseFare: { economy: 35, comfort: 55, premium: 100, van: 120, suv: 150 },
    perKm: { economy: 6.5, comfort: 9, premium: 14, van: 12, suv: 15 },
    currency: 'THB',
    vehicles: [
      { type: 'economy', name: 'GrabCar', capacity: 4, multiplier: 1 },
      { type: 'comfort', name: 'GrabCar Plus', capacity: 4, multiplier: 1.4 },
      { type: 'premium', name: 'GrabCar Premium', capacity: 4, multiplier: 2.2 },
      { type: 'van', name: 'Grab 6-Seater', capacity: 6, multiplier: 1.8 },
      { type: 'suv', name: 'GrabCar XL', capacity: 6, multiplier: 2.0 },
    ],
  },
  'Ho Chi Minh City': {
    providers: ['Grab', 'Be', 'Gojek', 'Xanh SM'],
    baseFare: { economy: 12000, comfort: 20000, premium: 40000, van: 35000, suv: 45000 },
    perKm: { economy: 4200, comfort: 6000, premium: 9500, van: 7500, suv: 10000 },
    currency: 'VND',
    vehicles: [
      { type: 'economy', name: 'GrabCar 4', capacity: 4, multiplier: 1 },
      { type: 'comfort', name: 'GrabCar Plus', capacity: 4, multiplier: 1.5 },
      { type: 'premium', name: 'GrabCar Lux', capacity: 4, multiplier: 2.5 },
      { type: 'van', name: 'Grab 7-Seater', capacity: 7, multiplier: 2.0 },
      { type: 'suv', name: 'GrabCar SUV', capacity: 6, multiplier: 2.2 },
    ],
  },
  Singapore: {
    providers: ['Grab', 'Gojek', 'ComfortDelGro', 'TADA'],
    baseFare: { economy: 3.2, comfort: 5, premium: 8, van: 7, suv: 9 },
    perKm: { economy: 0.65, comfort: 0.9, premium: 1.5, van: 1.2, suv: 1.6 },
    currency: 'SGD',
    vehicles: [
      { type: 'economy', name: 'JustGrab', capacity: 4, multiplier: 1 },
      { type: 'comfort', name: 'GrabCar Premium', capacity: 4, multiplier: 1.6 },
      { type: 'premium', name: 'GrabCar Exec', capacity: 4, multiplier: 2.5 },
      { type: 'van', name: 'Grab 6-Seater', capacity: 6, multiplier: 2.0 },
      { type: 'suv', name: 'GrabCar XL', capacity: 6, multiplier: 2.2 },
    ],
  },
  Manila: {
    providers: ['Grab', 'Angkas', 'Joyride', 'InDrive'],
    baseFare: { economy: 40, comfort: 70, premium: 120, van: 100, suv: 130 },
    perKm: { economy: 13, comfort: 18, premium: 28, van: 22, suv: 30 },
    currency: 'PHP',
    vehicles: [
      { type: 'economy', name: 'GrabCar', capacity: 4, multiplier: 1 },
      { type: 'comfort', name: 'GrabCar 6', capacity: 6, multiplier: 1.5 },
      { type: 'premium', name: 'GrabCar Premium', capacity: 4, multiplier: 2.2 },
      { type: 'van', name: 'Grab Van', capacity: 10, multiplier: 2.0 },
      { type: 'suv', name: 'GrabCar SUV', capacity: 6, multiplier: 2.3 },
    ],
  },
  Tokyo: {
    providers: ['GO Taxi', 'Uber', 'S.RIDE', 'DiDi'],
    baseFare: { economy: 420, comfort: 600, premium: 900, van: 800, suv: 1000 },
    perKm: { economy: 280, comfort: 380, premium: 550, van: 450, suv: 600 },
    currency: 'JPY',
    vehicles: [
      { type: 'economy', name: 'Standard Taxi', capacity: 4, multiplier: 1 },
      { type: 'comfort', name: 'Premium Taxi', capacity: 4, multiplier: 1.5 },
      { type: 'premium', name: 'Black Car', capacity: 4, multiplier: 2.2 },
      { type: 'van', name: 'Jumbo Taxi', capacity: 9, multiplier: 2.0 },
      { type: 'suv', name: 'Alphard', capacity: 6, multiplier: 2.5 },
    ],
  },
  Seoul: {
    providers: ['Kakao T', 'Uber', 'Tmap', 'UT'],
    baseFare: { economy: 4800, comfort: 7000, premium: 12000, van: 10000, suv: 13000 },
    perKm: { economy: 1200, comfort: 1800, premium: 2800, van: 2200, suv: 3000 },
    currency: 'KRW',
    vehicles: [
      { type: 'economy', name: '일반택시', capacity: 4, multiplier: 1 },
      { type: 'comfort', name: '모범택시', capacity: 4, multiplier: 1.5 },
      { type: 'premium', name: '블랙', capacity: 4, multiplier: 2.5 },
      { type: 'van', name: '대형택시', capacity: 8, multiplier: 2.0 },
      { type: 'suv', name: 'SUV', capacity: 6, multiplier: 2.3 },
    ],
  },
};

const VEHICLE_ICONS: Record<string, string> = {
  economy: '🚗',
  comfort: '🚙',
  premium: '🏎️',
  van: '🚐',
  suv: '🚘',
};

// ── City-specific restaurant data ──────────────────────────────
const CITY_RESTAURANTS: Record<string, {
  currency: string;
  restaurants: Omit<DemoRestaurant, 'id'>[];
}> = {
  Bangkok: {
    currency: 'THB',
    restaurants: [
      {
        name: 'Som Tam Nua', nameLocal: 'ส้มตำนัว', category: 'thai', categoryIcon: '🍜',
        rating: 4.7, reviewCount: 2340, deliveryTime: 25, deliveryFee: 29, minOrder: 100,
        imageUrl: '', priceRange: '$$', distance: '1.2 km', isOpen: true, isFeatured: true,
        tags: ['Thai', 'Papaya Salad', 'Isaan'], menu: [
          { id: 'st1', name: 'Som Tam Thai', nameLocal: 'ส้มตำไทย', description: 'Classic papaya salad', price: 89, imageUrl: '', category: 'Salad', isPopular: true, isSpicy: true, isVegetarian: true },
          { id: 'st2', name: 'Larb Moo', nameLocal: 'ลาบหมู', description: 'Spicy minced pork salad', price: 99, imageUrl: '', category: 'Main', isPopular: true, isSpicy: true, isVegetarian: false },
          { id: 'st3', name: 'Grilled Chicken', nameLocal: 'ไก่ย่าง', description: 'Isaan-style grilled chicken', price: 149, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'st4', name: 'Sticky Rice', nameLocal: 'ข้าวเหนียว', description: 'Steamed sticky rice', price: 20, imageUrl: '', category: 'Side', isPopular: false, isSpicy: false, isVegetarian: true },
        ],
      },
      {
        name: 'Pad Thai Thip Samai', nameLocal: 'ผัดไทยทิพย์สมัย', category: 'thai', categoryIcon: '🍜',
        rating: 4.5, reviewCount: 5120, deliveryTime: 30, deliveryFee: 39, minOrder: 80,
        imageUrl: '', priceRange: '$$', distance: '2.5 km', isOpen: true, isFeatured: true,
        tags: ['Thai', 'Pad Thai', 'Noodles'], menu: [
          { id: 'pt1', name: 'Pad Thai Wrapped in Egg', nameLocal: 'ผัดไทยห่อไข่', description: 'Signature pad thai wrapped in omelette', price: 120, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'pt2', name: 'Pad Thai Goong', nameLocal: 'ผัดไทยกุ้ง', description: 'Pad thai with prawns', price: 150, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'pt3', name: 'Orange Juice', nameLocal: 'น้ำส้มคั้น', description: 'Fresh squeezed orange juice', price: 50, imageUrl: '', category: 'Drink', isPopular: false, isSpicy: false, isVegetarian: true },
        ],
      },
      {
        name: 'Raan Jay Fai', nameLocal: 'ร้านเจ๊ไฝ', category: 'thai', categoryIcon: '🦀',
        rating: 4.9, reviewCount: 890, deliveryTime: 45, deliveryFee: 59, minOrder: 300,
        imageUrl: '', priceRange: '$$$', distance: '3.1 km', isOpen: true, isFeatured: false,
        tags: ['Thai', 'Michelin Star', 'Seafood'], menu: [
          { id: 'jf1', name: 'Crab Omelette', nameLocal: 'ไข่เจียวปู', description: 'Famous Michelin-star crab omelette', price: 1000, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'jf2', name: 'Drunken Noodles', nameLocal: 'ผัดขี้เมา', description: 'Spicy drunken noodles', price: 250, imageUrl: '', category: 'Main', isPopular: true, isSpicy: true, isVegetarian: false },
        ],
      },
      {
        name: 'After You Dessert', nameLocal: 'อาฟเตอร์ยู', category: 'dessert', categoryIcon: '🍰',
        rating: 4.6, reviewCount: 3200, deliveryTime: 20, deliveryFee: 49, minOrder: 150,
        imageUrl: '', priceRange: '$$', distance: '0.8 km', isOpen: true, isFeatured: false,
        tags: ['Dessert', 'Cafe', 'Bingsu'], menu: [
          { id: 'ay1', name: 'Shibuya Honey Toast', nameLocal: 'ชิบูย่าฮันนี่โทสต์', description: 'Signature honey toast', price: 295, imageUrl: '', category: 'Dessert', isPopular: true, isSpicy: false, isVegetarian: true },
          { id: 'ay2', name: 'Mango Sticky Rice Bingsu', nameLocal: 'บิงซูข้าวเหนียวมะม่วง', description: 'Thai-style bingsu', price: 259, imageUrl: '', category: 'Dessert', isPopular: true, isSpicy: false, isVegetarian: true },
        ],
      },
      {
        name: 'Sushi Hiro', nameLocal: 'ซูชิ ฮิโระ', category: 'japanese', categoryIcon: '🍣',
        rating: 4.4, reviewCount: 1560, deliveryTime: 35, deliveryFee: 49, minOrder: 200,
        imageUrl: '', priceRange: '$$$', distance: '1.8 km', isOpen: true, isFeatured: false,
        tags: ['Japanese', 'Sushi', 'Premium'], menu: [
          { id: 'sh1', name: 'Salmon Sashimi Set', nameLocal: 'แซลมอนซาชิมิเซ็ต', description: '12 pieces of fresh salmon', price: 390, imageUrl: '', category: 'Sashimi', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'sh2', name: 'Premium Sushi Set', nameLocal: 'พรีเมียมซูชิเซ็ต', description: '10 pieces assorted sushi', price: 450, imageUrl: '', category: 'Sushi', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'sh3', name: 'Unagi Don', nameLocal: 'อุนากิดอน', description: 'Grilled eel rice bowl', price: 350, imageUrl: '', category: 'Rice Bowl', isPopular: false, isSpicy: false, isVegetarian: false },
        ],
      },
      {
        name: 'Korean BBQ House', nameLocal: '한국 바베큐 하우스', category: 'korean', categoryIcon: '🥩',
        rating: 4.3, reviewCount: 980, deliveryTime: 40, deliveryFee: 39, minOrder: 250,
        imageUrl: '', priceRange: '$$', distance: '2.0 km', isOpen: true, isFeatured: false,
        tags: ['Korean', 'BBQ', 'Grill'], menu: [
          { id: 'kb1', name: 'Bulgogi Set', nameLocal: 'บูลโกกิเซ็ต', description: 'Marinated beef BBQ set for 2', price: 499, imageUrl: '', category: 'BBQ', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'kb2', name: 'Kimchi Jjigae', nameLocal: 'กิมจิจิเก', description: 'Kimchi stew with pork', price: 189, imageUrl: '', category: 'Soup', isPopular: true, isSpicy: true, isVegetarian: false },
          { id: 'kb3', name: 'Bibimbap', nameLocal: 'บิบิมบับ', description: 'Mixed rice bowl', price: 159, imageUrl: '', category: 'Rice', isPopular: false, isSpicy: false, isVegetarian: true },
        ],
      },
    ],
  },
  Singapore: {
    currency: 'SGD',
    restaurants: [
      {
        name: 'Liao Fan Hawker Chan', nameLocal: '了凡香港油鸡饭面', category: 'chinese', categoryIcon: '🍗',
        rating: 4.8, reviewCount: 4500, deliveryTime: 20, deliveryFee: 2.5, minOrder: 8,
        imageUrl: '', priceRange: '$', distance: '0.5 km', isOpen: true, isFeatured: true,
        tags: ['Michelin', 'Chicken Rice', 'Hawker'], menu: [
          { id: 'hc1', name: 'Soya Sauce Chicken Rice', nameLocal: '油鸡饭', description: 'Michelin-starred soy sauce chicken', price: 3.8, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'hc2', name: 'Char Siu Rice', nameLocal: '叉烧饭', description: 'BBQ pork rice', price: 3.8, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'hc3', name: 'Soya Sauce Chicken Noodle', nameLocal: '油鸡面', description: 'Chicken with noodles', price: 3.8, imageUrl: '', category: 'Main', isPopular: false, isSpicy: false, isVegetarian: false },
        ],
      },
      {
        name: 'Burnt Ends', nameLocal: 'Burnt Ends', category: 'western', categoryIcon: '🔥',
        rating: 4.9, reviewCount: 1200, deliveryTime: 40, deliveryFee: 5, minOrder: 30,
        imageUrl: '', priceRange: '$$$', distance: '3.2 km', isOpen: true, isFeatured: true,
        tags: ['BBQ', 'Fine Dining', 'Michelin'], menu: [
          { id: 'be1', name: 'Pulled Pork Brioche', nameLocal: 'Pulled Pork Brioche', description: 'Signature pulled pork sandwich', price: 22, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'be2', name: 'Smoked Wagyu Beef', nameLocal: 'Smoked Wagyu', description: 'A5 Wagyu smoked to perfection', price: 48, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
        ],
      },
      {
        name: 'Nasi Lemak Ayam Taliwang', nameLocal: 'Nasi Lemak Ayam Taliwang', category: 'malay', categoryIcon: '🍚',
        rating: 4.5, reviewCount: 2100, deliveryTime: 25, deliveryFee: 3, minOrder: 10,
        imageUrl: '', priceRange: '$', distance: '1.5 km', isOpen: true, isFeatured: false,
        tags: ['Malay', 'Nasi Lemak', 'Halal'], menu: [
          { id: 'nl1', name: 'Nasi Lemak Set', nameLocal: 'Nasi Lemak Set', description: 'Coconut rice with sambal, egg, peanuts', price: 5.5, imageUrl: '', category: 'Main', isPopular: true, isSpicy: true, isVegetarian: false },
          { id: 'nl2', name: 'Ayam Goreng', nameLocal: 'Ayam Goreng', description: 'Fried chicken', price: 4.5, imageUrl: '', category: 'Side', isPopular: true, isSpicy: false, isVegetarian: false },
        ],
      },
    ],
  },
  'Ho Chi Minh City': {
    currency: 'VND',
    restaurants: [
      {
        name: 'Pho Hoa Pasteur', nameLocal: 'Phở Hòa Pasteur', category: 'vietnamese', categoryIcon: '🍜',
        rating: 4.6, reviewCount: 3800, deliveryTime: 20, deliveryFee: 15000, minOrder: 50000,
        imageUrl: '', priceRange: '$', distance: '1.0 km', isOpen: true, isFeatured: true,
        tags: ['Vietnamese', 'Pho', 'Noodle Soup'], menu: [
          { id: 'ph1', name: 'Pho Bo Tai', nameLocal: 'Phở Bò Tái', description: 'Beef pho with rare steak', price: 75000, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'ph2', name: 'Pho Ga', nameLocal: 'Phở Gà', description: 'Chicken pho', price: 65000, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'ph3', name: 'Spring Rolls', nameLocal: 'Gỏi Cuốn', description: 'Fresh spring rolls', price: 45000, imageUrl: '', category: 'Appetizer', isPopular: false, isSpicy: false, isVegetarian: true },
        ],
      },
      {
        name: 'Banh Mi Huynh Hoa', nameLocal: 'Bánh Mì Huỳnh Hoa', category: 'vietnamese', categoryIcon: '🥖',
        rating: 4.7, reviewCount: 6200, deliveryTime: 15, deliveryFee: 10000, minOrder: 30000,
        imageUrl: '', priceRange: '$', distance: '0.8 km', isOpen: true, isFeatured: true,
        tags: ['Vietnamese', 'Banh Mi', 'Sandwich'], menu: [
          { id: 'bm1', name: 'Banh Mi Dac Biet', nameLocal: 'Bánh Mì Đặc Biệt', description: 'Special combo banh mi', price: 47000, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
          { id: 'bm2', name: 'Banh Mi Thit', nameLocal: 'Bánh Mì Thịt', description: 'Pork banh mi', price: 35000, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
        ],
      },
    ],
  },
};

// Default restaurant data for cities not in the map
const DEFAULT_RESTAURANTS: Omit<DemoRestaurant, 'id'>[] = [
  {
    name: 'Local Kitchen', nameLocal: 'Local Kitchen', category: 'local', categoryIcon: '🍽️',
    rating: 4.3, reviewCount: 500, deliveryTime: 30, deliveryFee: 3, minOrder: 10,
    imageUrl: '', priceRange: '$$', distance: '1.5 km', isOpen: true, isFeatured: true,
    tags: ['Local', 'Popular'], menu: [
      { id: 'dk1', name: 'Chef Special', nameLocal: 'Chef Special', description: 'Daily chef special', price: 12, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
      { id: 'dk2', name: 'Grilled Fish', nameLocal: 'Grilled Fish', description: 'Fresh grilled fish', price: 15, imageUrl: '', category: 'Main', isPopular: true, isSpicy: false, isVegetarian: false },
      { id: 'dk3', name: 'Vegetable Stir Fry', nameLocal: 'Vegetable Stir Fry', description: 'Mixed vegetables', price: 8, imageUrl: '', category: 'Main', isPopular: false, isSpicy: false, isVegetarian: true },
    ],
  },
];

// ── Generator Functions ──────────────────────────────

export function generateDemoRideOptions(
  city: string,
  distanceKm: number,
  exchangeRate: number,
  vatRate: number,
): DemoRideOption[] {
  const cityData = CITY_RIDE_DATA[city] || CITY_RIDE_DATA['Bangkok'];
  const results: DemoRideOption[] = [];
  
  for (const vehicle of cityData.vehicles) {
    const vType = vehicle.type as DemoRideOption['vehicleType'];
    const baseFare = cityData.baseFare[vType] || cityData.baseFare['economy'];
    const perKm = cityData.perKm[vType] || cityData.perKm['economy'];
    
    // Calculate local price with some randomness
    const surge = Math.random() > 0.7 ? 1.2 + Math.random() * 0.5 : 1.0;
    const rawPrice = baseFare + (perKm * distanceKm);
    const priceLocal = Math.round(rawPrice * surge * vehicle.multiplier);
    
    // VAT calculation
    const priceExVat = priceLocal / (1 + vatRate);
    const vatAmount = priceLocal - priceExVat;
    
    // Convert to USD/USDT
    const priceUsd = priceLocal / exchangeRate;
    const platformMarkupRate = 0.03; // 3% markup (keeps USDT cheaper than local+VAT)
    const platformMarkup = (priceExVat / exchangeRate) * platformMarkupRate;
    const priceUsdt = (priceExVat / exchangeRate) + platformMarkup;
    const vatSaved = vatAmount / exchangeRate;
    const savingsPercent = ((priceUsd - priceUsdt) / priceUsd) * 100;
    
    // Estimated time based on distance
    const estimatedMinutes = Math.round(distanceKm * 3 + Math.random() * 10 + 5);
    const eta = Math.round(2 + Math.random() * 8);
    
    // Pick random providers
    const providerIdx = Math.floor(Math.random() * cityData.providers.length);
    
    results.push({
      id: `ride-${vType}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      provider: cityData.providers[providerIdx],
      providerLogo: '',
      vehicleType: vType,
      vehicleName: vehicle.name,
      vehicleIcon: VEHICLE_ICONS[vType] || '🚗',
      capacity: vehicle.capacity,
      estimatedMinutes,
      distanceKm,
      priceLocal: Math.round(priceLocal),
      localCurrency: cityData.currency,
      priceUsd: Math.round(priceUsd * 100) / 100,
      priceUsdt: Math.round(priceUsdt * 100) / 100,
      vatAmount: Math.round((vatAmount / exchangeRate) * 100) / 100,
      vatSaved: Math.round(vatSaved * 100) / 100,
      savingsPercent: Math.round(savingsPercent * 10) / 10,
      platformMarkup: Math.round(platformMarkup * 100) / 100,
      surge: Math.round(surge * 10) / 10,
      features: vType === 'premium' ? ['WiFi', 'Water', 'Charger', 'Leather Seats'] :
                vType === 'comfort' ? ['WiFi', 'Water', 'Charger'] :
                vType === 'van' ? ['Large Luggage', 'WiFi'] :
                ['Air Conditioning'],
      rating: Math.round((4.2 + Math.random() * 0.7) * 10) / 10,
      eta,
    });
  }
  
  return results.sort((a, b) => a.priceUsdt - b.priceUsdt);
}

export function generateDemoRestaurants(
  city: string,
  exchangeRate: number,
  vatRate: number,
): DemoRestaurant[] {
  const cityData = CITY_RESTAURANTS[city] || null;
  const restaurants = cityData ? cityData.restaurants : DEFAULT_RESTAURANTS;
  
  return restaurants.map((r, idx) => ({
    ...r,
    id: `rest-${idx}-${Date.now()}`,
    // Convert prices to USD-equivalent for display
    menu: r.menu.map(m => ({
      ...m,
      // Keep original local prices
    })),
  }));
}

export function calculateDeliveryPricing(
  subtotal: number,
  deliveryFee: number,
  localCurrency: string,
  exchangeRate: number,
  vatRate: number,
) {
  const serviceFeeRate = 0.05; // 5% service fee
  const serviceFee = subtotal * serviceFeeRate;
  const totalLocal = subtotal + deliveryFee + serviceFee;
  
  // VAT calculation
  const totalExVat = totalLocal / (1 + vatRate);
  const vatAmount = totalLocal - totalExVat;
  
  // Convert to USD/USDT
  const totalUsd = totalLocal / exchangeRate;
  // Platform markup is applied on ex-VAT price, keeping it small enough
  // so USDT total is still cheaper than local price with VAT
  const platformMarkupRate = 0.03; // 3% markup (was 10%)
  const platformMarkup = (totalExVat / exchangeRate) * platformMarkupRate;
  const totalUsdt = (totalExVat / exchangeRate) + platformMarkup;
  const vatSaved = vatAmount / exchangeRate;
  const savingsPercent = ((totalUsd - totalUsdt) / totalUsd) * 100;
  
  return {
    subtotal,
    deliveryFee,
    serviceFee: Math.round(serviceFee),
    totalLocal: Math.round(totalLocal),
    localCurrency,
    totalUsd: Math.round(totalUsd * 100) / 100,
    totalUsdt: Math.round(totalUsdt * 100) / 100,
    vatAmount: Math.round((vatAmount / exchangeRate) * 100) / 100,
    vatRate: Math.round(vatRate * 10000) / 100,
    vatSaved: Math.round(vatSaved * 100) / 100,
    savingsPercent: Math.round(savingsPercent * 10) / 10,
    platformMarkup: Math.round(platformMarkup * 100) / 100,
  };
}

export const SUPPORTED_CITIES = Object.keys(CITY_RIDE_DATA);
export const FOOD_CATEGORIES = ['all', 'thai', 'vietnamese', 'chinese', 'japanese', 'korean', 'western', 'malay', 'dessert', 'local'] as const;
