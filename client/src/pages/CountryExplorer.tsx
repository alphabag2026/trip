import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Globe, MapPin, Clock, DollarSign, Languages as LangIcon,
  Plug, Phone, Plane, ChevronRight, ArrowLeft, Shield, Info, Wifi,
  Thermometer, AlertTriangle
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

// ═══════════════════════════════════════════════════════
// 전 세계 국가 데이터 (대륙별 분류)
// ═══════════════════════════════════════════════════════
type Country = {
  code: string;
  name: string;
  nameKo: string;
  nameZh: string;
  flag: string;
  capital: string;
  capitalKo: string;
  continent: string;
  timezone: string;
  currency: string;
  currencySymbol: string;
  language: string;
  plugType: string;
  dialCode: string;
  visaForKR: string; // 한국 여권 기준 비자 정보
};

const COUNTRIES: Country[] = [
  // ── 동아시아 ──
  { code: "KR", name: "South Korea", nameKo: "한국", nameZh: "韩国", flag: "🇰🇷", capital: "Seoul", capitalKo: "서울", continent: "asia", timezone: "UTC+9", currency: "KRW", currencySymbol: "₩", language: "한국어", plugType: "Type C/F", dialCode: "+82", visaForKR: "-" },
  { code: "JP", name: "Japan", nameKo: "일본", nameZh: "日本", flag: "🇯🇵", capital: "Tokyo", capitalKo: "도쿄", continent: "asia", timezone: "UTC+9", currency: "JPY", currencySymbol: "¥", language: "일본어", plugType: "Type A/B", dialCode: "+81", visaForKR: "90일 무비자" },
  { code: "CN", name: "China", nameKo: "중국", nameZh: "中国", flag: "🇨🇳", capital: "Beijing", capitalKo: "베이징", continent: "asia", timezone: "UTC+8", currency: "CNY", currencySymbol: "¥", language: "중국어", plugType: "Type A/C/I", dialCode: "+86", visaForKR: "15일 무비자(일부)" },
  { code: "TW", name: "Taiwan", nameKo: "대만", nameZh: "台湾", flag: "🇹🇼", capital: "Taipei", capitalKo: "타이베이", continent: "asia", timezone: "UTC+8", currency: "TWD", currencySymbol: "NT$", language: "중국어", plugType: "Type A/B", dialCode: "+886", visaForKR: "90일 무비자" },
  { code: "HK", name: "Hong Kong", nameKo: "홍콩", nameZh: "香港", flag: "🇭🇰", capital: "Hong Kong", capitalKo: "홍콩", continent: "asia", timezone: "UTC+8", currency: "HKD", currencySymbol: "HK$", language: "중국어/영어", plugType: "Type G", dialCode: "+852", visaForKR: "90일 무비자" },
  { code: "MO", name: "Macau", nameKo: "마카오", nameZh: "澳门", flag: "🇲🇴", capital: "Macau", capitalKo: "마카오", continent: "asia", timezone: "UTC+8", currency: "MOP", currencySymbol: "MOP$", language: "중국어/포르투갈어", plugType: "Type G", dialCode: "+853", visaForKR: "90일 무비자" },
  { code: "MN", name: "Mongolia", nameKo: "몽골", nameZh: "蒙古", flag: "🇲🇳", capital: "Ulaanbaatar", capitalKo: "울란바토르", continent: "asia", timezone: "UTC+8", currency: "MNT", currencySymbol: "₮", language: "몽골어", plugType: "Type C/E", dialCode: "+976", visaForKR: "30일 무비자" },
  // ── 동남아시아 ──
  { code: "TH", name: "Thailand", nameKo: "태국", nameZh: "泰国", flag: "🇹🇭", capital: "Bangkok", capitalKo: "방콕", continent: "asia", timezone: "UTC+7", currency: "THB", currencySymbol: "฿", language: "태국어", plugType: "Type A/B/C", dialCode: "+66", visaForKR: "90일 무비자" },
  { code: "VN", name: "Vietnam", nameKo: "베트남", nameZh: "越南", flag: "🇻🇳", capital: "Hanoi", capitalKo: "하노이", continent: "asia", timezone: "UTC+7", currency: "VND", currencySymbol: "₫", language: "베트남어", plugType: "Type A/C", dialCode: "+84", visaForKR: "45일 무비자" },
  { code: "PH", name: "Philippines", nameKo: "필리핀", nameZh: "菲律宾", flag: "🇵🇭", capital: "Manila", capitalKo: "마닐라", continent: "asia", timezone: "UTC+8", currency: "PHP", currencySymbol: "₱", language: "필리핀어/영어", plugType: "Type A/B/C", dialCode: "+63", visaForKR: "30일 무비자" },
  { code: "SG", name: "Singapore", nameKo: "싱가포르", nameZh: "新加坡", flag: "🇸🇬", capital: "Singapore", capitalKo: "싱가포르", continent: "asia", timezone: "UTC+8", currency: "SGD", currencySymbol: "S$", language: "영어/중국어/말레이어/타밀어", plugType: "Type G", dialCode: "+65", visaForKR: "90일 무비자" },
  { code: "MY", name: "Malaysia", nameKo: "말레이시아", nameZh: "马来西亚", flag: "🇲🇾", capital: "Kuala Lumpur", capitalKo: "쿠알라룸푸르", continent: "asia", timezone: "UTC+8", currency: "MYR", currencySymbol: "RM", language: "말레이어", plugType: "Type G", dialCode: "+60", visaForKR: "90일 무비자" },
  { code: "ID", name: "Indonesia", nameKo: "인도네시아", nameZh: "印度尼西亚", flag: "🇮🇩", capital: "Jakarta", capitalKo: "자카르타", continent: "asia", timezone: "UTC+7~9", currency: "IDR", currencySymbol: "Rp", language: "인도네시아어", plugType: "Type C/F", dialCode: "+62", visaForKR: "30일 무비자" },
  { code: "KH", name: "Cambodia", nameKo: "캄보디아", nameZh: "柬埔寨", flag: "🇰🇭", capital: "Phnom Penh", capitalKo: "프놈펜", continent: "asia", timezone: "UTC+7", currency: "KHR", currencySymbol: "៛", language: "크메르어", plugType: "Type A/C/G", dialCode: "+855", visaForKR: "비자 필요" },
  { code: "LA", name: "Laos", nameKo: "라오스", nameZh: "老挝", flag: "🇱🇦", capital: "Vientiane", capitalKo: "비엔티안", continent: "asia", timezone: "UTC+7", currency: "LAK", currencySymbol: "₭", language: "라오어", plugType: "Type A/B/C/E/F", dialCode: "+856", visaForKR: "15일 무비자" },
  { code: "MM", name: "Myanmar", nameKo: "미얀마", nameZh: "缅甸", flag: "🇲🇲", capital: "Naypyidaw", capitalKo: "네피도", continent: "asia", timezone: "UTC+6:30", currency: "MMK", currencySymbol: "K", language: "미얀마어", plugType: "Type C/D/F/G", dialCode: "+95", visaForKR: "비자 필요" },
  // ── 남아시아 ──
  { code: "IN", name: "India", nameKo: "인도", nameZh: "印度", flag: "🇮🇳", capital: "New Delhi", capitalKo: "뉴델리", continent: "asia", timezone: "UTC+5:30", currency: "INR", currencySymbol: "₹", language: "힌디어/영어", plugType: "Type C/D/M", dialCode: "+91", visaForKR: "비자 필요" },
  { code: "LK", name: "Sri Lanka", nameKo: "스리랑카", nameZh: "斯里兰卡", flag: "🇱🇰", capital: "Colombo", capitalKo: "콜롬보", continent: "asia", timezone: "UTC+5:30", currency: "LKR", currencySymbol: "Rs", language: "싱할라어/타밀어", plugType: "Type D/G", dialCode: "+94", visaForKR: "ETA 필요" },
  { code: "NP", name: "Nepal", nameKo: "네팔", nameZh: "尼泊尔", flag: "🇳🇵", capital: "Kathmandu", capitalKo: "카트만두", continent: "asia", timezone: "UTC+5:45", currency: "NPR", currencySymbol: "Rs", language: "네팔어", plugType: "Type C/D/M", dialCode: "+977", visaForKR: "도착비자" },
  // ── 중동 ──
  { code: "AE", name: "UAE", nameKo: "아랍에미리트", nameZh: "阿联酋", flag: "🇦🇪", capital: "Abu Dhabi", capitalKo: "아부다비", continent: "middle_east", timezone: "UTC+4", currency: "AED", currencySymbol: "د.إ", language: "아랍어", plugType: "Type G", dialCode: "+971", visaForKR: "90일 무비자" },
  { code: "TR", name: "Turkey", nameKo: "튀르키예", nameZh: "土耳其", flag: "🇹🇷", capital: "Ankara", capitalKo: "앙카라", continent: "middle_east", timezone: "UTC+3", currency: "TRY", currencySymbol: "₺", language: "터키어", plugType: "Type C/F", dialCode: "+90", visaForKR: "90일 무비자" },
  { code: "IL", name: "Israel", nameKo: "이스라엘", nameZh: "以色列", flag: "🇮🇱", capital: "Jerusalem", capitalKo: "예루살렘", continent: "middle_east", timezone: "UTC+2", currency: "ILS", currencySymbol: "₪", language: "히브리어", plugType: "Type C/H/M", dialCode: "+972", visaForKR: "90일 무비자" },
  { code: "QA", name: "Qatar", nameKo: "카타르", nameZh: "卡塔尔", flag: "🇶🇦", capital: "Doha", capitalKo: "도하", continent: "middle_east", timezone: "UTC+3", currency: "QAR", currencySymbol: "ر.ق", language: "아랍어", plugType: "Type G", dialCode: "+974", visaForKR: "30일 무비자" },
  // ── 유럽 ──
  { code: "GB", name: "United Kingdom", nameKo: "영국", nameZh: "英国", flag: "🇬🇧", capital: "London", capitalKo: "런던", continent: "europe", timezone: "UTC+0", currency: "GBP", currencySymbol: "£", language: "영어", plugType: "Type G", dialCode: "+44", visaForKR: "6개월 무비자" },
  { code: "FR", name: "France", nameKo: "프랑스", nameZh: "法国", flag: "🇫🇷", capital: "Paris", capitalKo: "파리", continent: "europe", timezone: "UTC+1", currency: "EUR", currencySymbol: "€", language: "프랑스어", plugType: "Type C/E", dialCode: "+33", visaForKR: "90일 무비자" },
  { code: "DE", name: "Germany", nameKo: "독일", nameZh: "德国", flag: "🇩🇪", capital: "Berlin", capitalKo: "베를린", continent: "europe", timezone: "UTC+1", currency: "EUR", currencySymbol: "€", language: "독일어", plugType: "Type C/F", dialCode: "+49", visaForKR: "90일 무비자" },
  { code: "IT", name: "Italy", nameKo: "이탈리아", nameZh: "意大利", flag: "🇮🇹", capital: "Rome", capitalKo: "로마", continent: "europe", timezone: "UTC+1", currency: "EUR", currencySymbol: "€", language: "이탈리아어", plugType: "Type C/F/L", dialCode: "+39", visaForKR: "90일 무비자" },
  { code: "ES", name: "Spain", nameKo: "스페인", nameZh: "西班牙", flag: "🇪🇸", capital: "Madrid", capitalKo: "마드리드", continent: "europe", timezone: "UTC+1", currency: "EUR", currencySymbol: "€", language: "스페인어", plugType: "Type C/F", dialCode: "+34", visaForKR: "90일 무비자" },
  { code: "PT", name: "Portugal", nameKo: "포르투갈", nameZh: "葡萄牙", flag: "🇵🇹", capital: "Lisbon", capitalKo: "리스본", continent: "europe", timezone: "UTC+0", currency: "EUR", currencySymbol: "€", language: "포르투갈어", plugType: "Type C/F", dialCode: "+351", visaForKR: "90일 무비자" },
  { code: "NL", name: "Netherlands", nameKo: "네덜란드", nameZh: "荷兰", flag: "🇳🇱", capital: "Amsterdam", capitalKo: "암스테르담", continent: "europe", timezone: "UTC+1", currency: "EUR", currencySymbol: "€", language: "네덜란드어", plugType: "Type C/F", dialCode: "+31", visaForKR: "90일 무비자" },
  { code: "CH", name: "Switzerland", nameKo: "스위스", nameZh: "瑞士", flag: "🇨🇭", capital: "Bern", capitalKo: "베른", continent: "europe", timezone: "UTC+1", currency: "CHF", currencySymbol: "CHF", language: "독일어/프랑스어/이탈리아어", plugType: "Type C/J", dialCode: "+41", visaForKR: "90일 무비자" },
  { code: "SE", name: "Sweden", nameKo: "스웨덴", nameZh: "瑞典", flag: "🇸🇪", capital: "Stockholm", capitalKo: "스톡홀름", continent: "europe", timezone: "UTC+1", currency: "SEK", currencySymbol: "kr", language: "스웨덴어", plugType: "Type C/F", dialCode: "+46", visaForKR: "90일 무비자" },
  { code: "PL", name: "Poland", nameKo: "폴란드", nameZh: "波兰", flag: "🇵🇱", capital: "Warsaw", capitalKo: "바르샤바", continent: "europe", timezone: "UTC+1", currency: "PLN", currencySymbol: "zł", language: "폴란드어", plugType: "Type C/E", dialCode: "+48", visaForKR: "90일 무비자" },
  { code: "CZ", name: "Czech Republic", nameKo: "체코", nameZh: "捷克", flag: "🇨🇿", capital: "Prague", capitalKo: "프라하", continent: "europe", timezone: "UTC+1", currency: "CZK", currencySymbol: "Kč", language: "체코어", plugType: "Type C/E", dialCode: "+420", visaForKR: "90일 무비자" },
  { code: "RU", name: "Russia", nameKo: "러시아", nameZh: "俄罗斯", flag: "🇷🇺", capital: "Moscow", capitalKo: "모스크바", continent: "europe", timezone: "UTC+3", currency: "RUB", currencySymbol: "₽", language: "러시아어", plugType: "Type C/F", dialCode: "+7", visaForKR: "비자 필요" },
  { code: "UA", name: "Ukraine", nameKo: "우크라이나", nameZh: "乌克兰", flag: "🇺🇦", capital: "Kyiv", capitalKo: "키이우", continent: "europe", timezone: "UTC+2", currency: "UAH", currencySymbol: "₴", language: "우크라이나어", plugType: "Type C/F", dialCode: "+380", visaForKR: "90일 무비자" },
  // ── 북미 ──
  { code: "US", name: "United States", nameKo: "미국", nameZh: "美国", flag: "🇺🇸", capital: "Washington D.C.", capitalKo: "워싱턴 D.C.", continent: "north_america", timezone: "UTC-5~-10", currency: "USD", currencySymbol: "$", language: "영어", plugType: "Type A/B", dialCode: "+1", visaForKR: "ESTA 필요" },
  { code: "CA", name: "Canada", nameKo: "캐나다", nameZh: "加拿大", flag: "🇨🇦", capital: "Ottawa", capitalKo: "오타와", continent: "north_america", timezone: "UTC-3.5~-8", currency: "CAD", currencySymbol: "C$", language: "영어/프랑스어", plugType: "Type A/B", dialCode: "+1", visaForKR: "eTA 필요" },
  { code: "MX", name: "Mexico", nameKo: "멕시코", nameZh: "墨西哥", flag: "🇲🇽", capital: "Mexico City", capitalKo: "멕시코시티", continent: "north_america", timezone: "UTC-6~-8", currency: "MXN", currencySymbol: "Mex$", language: "스페인어", plugType: "Type A/B", dialCode: "+52", visaForKR: "180일 무비자" },
  // ── 남미 ──
  { code: "BR", name: "Brazil", nameKo: "브라질", nameZh: "巴西", flag: "🇧🇷", capital: "Brasilia", capitalKo: "브라질리아", continent: "south_america", timezone: "UTC-3~-5", currency: "BRL", currencySymbol: "R$", language: "포르투갈어", plugType: "Type C/N", dialCode: "+55", visaForKR: "비자 필요" },
  { code: "AR", name: "Argentina", nameKo: "아르헨티나", nameZh: "阿根廷", flag: "🇦🇷", capital: "Buenos Aires", capitalKo: "부에노스아이레스", continent: "south_america", timezone: "UTC-3", currency: "ARS", currencySymbol: "AR$", language: "스페인어", plugType: "Type C/I", dialCode: "+54", visaForKR: "90일 무비자" },
  { code: "CL", name: "Chile", nameKo: "칠레", nameZh: "智利", flag: "🇨🇱", capital: "Santiago", capitalKo: "산티아고", continent: "south_america", timezone: "UTC-4", currency: "CLP", currencySymbol: "CL$", language: "스페인어", plugType: "Type C/L", dialCode: "+56", visaForKR: "90일 무비자" },
  { code: "PE", name: "Peru", nameKo: "페루", nameZh: "秘鲁", flag: "🇵🇪", capital: "Lima", capitalKo: "리마", continent: "south_america", timezone: "UTC-5", currency: "PEN", currencySymbol: "S/", language: "스페인어", plugType: "Type A/B/C", dialCode: "+51", visaForKR: "90일 무비자" },
  // ── 오세아니아 ──
  { code: "AU", name: "Australia", nameKo: "호주", nameZh: "澳大利亚", flag: "🇦🇺", capital: "Canberra", capitalKo: "캔버라", continent: "oceania", timezone: "UTC+8~+11", currency: "AUD", currencySymbol: "A$", language: "영어", plugType: "Type I", dialCode: "+61", visaForKR: "ETA 필요" },
  { code: "NZ", name: "New Zealand", nameKo: "뉴질랜드", nameZh: "新西兰", flag: "🇳🇿", capital: "Wellington", capitalKo: "웰링턴", continent: "oceania", timezone: "UTC+12", currency: "NZD", currencySymbol: "NZ$", language: "영어/마오리어", plugType: "Type I", dialCode: "+64", visaForKR: "NZeTA 필요" },
  { code: "GU", name: "Guam", nameKo: "괌", nameZh: "关岛", flag: "🇬🇺", capital: "Hagatna", capitalKo: "하갓냐", continent: "oceania", timezone: "UTC+10", currency: "USD", currencySymbol: "$", language: "영어/차모로어", plugType: "Type A/B", dialCode: "+1-671", visaForKR: "45일 무비자" },
  { code: "FJ", name: "Fiji", nameKo: "피지", nameZh: "斐济", flag: "🇫🇯", capital: "Suva", capitalKo: "수바", continent: "oceania", timezone: "UTC+12", currency: "FJD", currencySymbol: "FJ$", language: "영어/피지어", plugType: "Type I", dialCode: "+679", visaForKR: "120일 무비자" },
  // ── 아프리카 ──
  { code: "ZA", name: "South Africa", nameKo: "남아프리카공화국", nameZh: "南非", flag: "🇿🇦", capital: "Pretoria", capitalKo: "프리토리아", continent: "africa", timezone: "UTC+2", currency: "ZAR", currencySymbol: "R", language: "영어 외 11개", plugType: "Type M/N", dialCode: "+27", visaForKR: "30일 무비자" },
  { code: "EG", name: "Egypt", nameKo: "이집트", nameZh: "埃及", flag: "🇪🇬", capital: "Cairo", capitalKo: "카이로", continent: "africa", timezone: "UTC+2", currency: "EGP", currencySymbol: "E£", language: "아랍어", plugType: "Type C/F", dialCode: "+20", visaForKR: "도착비자" },
  { code: "MA", name: "Morocco", nameKo: "모로코", nameZh: "摩洛哥", flag: "🇲🇦", capital: "Rabat", capitalKo: "라바트", continent: "africa", timezone: "UTC+1", currency: "MAD", currencySymbol: "MAD", language: "아랍어/프랑스어", plugType: "Type C/E", dialCode: "+212", visaForKR: "90일 무비자" },
  { code: "KE", name: "Kenya", nameKo: "케냐", nameZh: "肯尼亚", flag: "🇰🇪", capital: "Nairobi", capitalKo: "나이로비", continent: "africa", timezone: "UTC+3", currency: "KES", currencySymbol: "KSh", language: "스와힐리어/영어", plugType: "Type G", dialCode: "+254", visaForKR: "eTA 필요" },
];

const CONTINENTS: { id: string; label: string; labelKo: string; labelZh: string; emoji: string }[] = [
  { id: "all", label: "All", labelKo: "전체", labelZh: "全部", emoji: "🌍" },
  { id: "asia", label: "Asia", labelKo: "아시아", labelZh: "亚洲", emoji: "🌏" },
  { id: "europe", label: "Europe", labelKo: "유럽", labelZh: "欧洲", emoji: "🌍" },
  { id: "north_america", label: "North America", labelKo: "북미", labelZh: "北美", emoji: "🌎" },
  { id: "south_america", label: "South America", labelKo: "남미", labelZh: "南美", emoji: "🌎" },
  { id: "oceania", label: "Oceania", labelKo: "오세아니아", labelZh: "大洋洲", emoji: "🏝️" },
  { id: "middle_east", label: "Middle East", labelKo: "중동", labelZh: "中东", emoji: "🕌" },
  { id: "africa", label: "Africa", labelKo: "아프리카", labelZh: "非洲", emoji: "🌍" },
];

export default function CountryExplorer() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [search, setSearch] = useState("");
  const [selectedContinent, setSelectedContinent] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  // DB에 저장된 여행 정보 가져오기
  const { data: travelInfoList } = trpc.travelInfo.list.useQuery();

  const getCountryName = (c: Country) => {
    if (lang === "ko") return c.nameKo;
    if (lang === "zh") return c.nameZh;
    return c.name;
  };

  const getContinentLabel = (cont: typeof CONTINENTS[0]) => {
    if (lang === "ko") return cont.labelKo;
    if (lang === "zh") return cont.labelZh;
    return cont.label;
  };

  const filtered = useMemo(() => {
    let list = COUNTRIES;
    if (selectedContinent !== "all") {
      list = list.filter(c => c.continent === selectedContinent);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.nameKo.includes(q) ||
        c.nameZh.includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.capitalKo.includes(q)
      );
    }
    return list;
  }, [selectedContinent, search]);

  const travelInfoMap = useMemo(() => {
    const map: Record<string, any> = {};
    travelInfoList?.forEach((ti: any) => { map[ti.countryCode] = ti; });
    return map;
  }, [travelInfoList]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <button className="p-2 rounded-lg hover:bg-accent transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{t("country.title", "국가/지역 정보")}</h1>
          </div>
          <Globe className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("country.search_placeholder", "국가명, 도시명으로 검색...")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        {/* Continent Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CONTINENTS.map(cont => (
            <button
              key={cont.id}
              onClick={() => setSelectedContinent(cont.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedContinent === cont.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:bg-accent border border-border"
              }`}
            >
              <span>{cont.emoji}</span>
              <span>{getContinentLabel(cont)}</span>
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {t("country.results_count", "{{count}}개 국가", { count: filtered.length })}
        </p>

        {/* Country Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(country => {
            const hasTravelInfo = !!travelInfoMap[country.code];
            return (
              <Card
                key={country.code}
                className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-border bg-card"
                onClick={() => setSelectedCountry(country)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">{country.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{getCountryName(country)}</p>
                      <p className="text-xs text-muted-foreground truncate">{country.capitalKo}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {country.timezone}
                    </Badge>
                    {hasTravelInfo && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                        {t("country.info_available", "정보")}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("country.no_results", "검색 결과가 없습니다")}</p>
          </div>
        )}
      </div>

      {/* Country Detail Dialog */}
      <Dialog open={!!selectedCountry} onOpenChange={open => { if (!open) setSelectedCountry(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedCountry && (
            <CountryDetail
              country={selectedCountry}
              travelInfo={travelInfoMap[selectedCountry.code]}
              lang={lang}
              t={t}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CountryDetail({ country, travelInfo, lang, t }: {
  country: Country;
  travelInfo: any;
  lang: string;
  t: any;
}) {
  const getCountryName = (c: Country) => {
    if (lang === "ko") return c.nameKo;
    if (lang === "zh") return c.nameZh;
    return c.name;
  };

  const infoRows = [
    { icon: MapPin, label: t("country.capital", "수도"), value: lang === "ko" ? country.capitalKo : country.capital },
    { icon: Clock, label: t("country.timezone", "시차"), value: country.timezone },
    { icon: DollarSign, label: t("country.currency", "통화"), value: `${country.currency} (${country.currencySymbol})` },
    { icon: LangIcon, label: t("country.language", "언어"), value: country.language },
    { icon: Plug, label: t("country.plug", "플러그"), value: country.plugType },
    { icon: Phone, label: t("country.dial_code", "국가번호"), value: country.dialCode },
    { icon: Shield, label: t("country.visa", "비자 (한국)"), value: country.visaForKR },
  ];

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <span className="text-4xl">{country.flag}</span>
          <div>
            <p className="text-xl font-bold">{getCountryName(country)}</p>
            <p className="text-sm text-muted-foreground font-normal">{country.name} ({country.code})</p>
          </div>
        </DialogTitle>
      </DialogHeader>

      {/* Basic Info Grid */}
      <div className="grid gap-2">
        {infoRows.map((row, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-accent/50">
            <row.icon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground w-16 shrink-0">{row.label}</span>
            <span className="text-sm font-medium flex-1">{row.value}</span>
          </div>
        ))}
      </div>

      {/* DB Travel Info (if available) */}
      {travelInfo && (
        <div className="space-y-3 pt-2 border-t border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            {t("country.travel_info", "여행 준비 정보")}
          </h3>

          {travelInfo.requiredItems && travelInfo.requiredItems.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1.5">{t("country.required_items", "필수 준비물")}</p>
              <div className="flex flex-wrap gap-1.5">
                {travelInfo.requiredItems.map((item: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                ))}
              </div>
            </div>
          )}

          {travelInfo.immigrationNotes && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm font-medium flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("country.immigration_notes", "출입국 안내")}
              </p>
              <p className="text-xs text-muted-foreground">{travelInfo.immigrationNotes}</p>
            </div>
          )}

          {travelInfo.visaNotes && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm font-medium flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1">
                <Shield className="h-3.5 w-3.5" />
                {t("country.visa_notes", "비자 안내")}
              </p>
              <p className="text-xs text-muted-foreground">{travelInfo.visaNotes}</p>
            </div>
          )}

          {travelInfo.emergencyContact && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <Phone className="h-4 w-4 text-red-500 shrink-0" />
              <div>
                <p className="text-xs text-red-500 font-medium">{t("country.emergency", "긴급 연락처")}</p>
                <p className="text-sm">{travelInfo.emergencyContact}</p>
              </div>
            </div>
          )}

          {travelInfo.additionalNotes && (
            <div className="p-3 rounded-lg bg-accent/50">
              <p className="text-sm font-medium mb-1">{t("country.additional_notes", "추가 정보")}</p>
              <p className="text-xs text-muted-foreground whitespace-pre-line">{travelInfo.additionalNotes}</p>
            </div>
          )}

          {travelInfo.immigrationUrl && (
            <a
              href={travelInfo.immigrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Plane className="h-4 w-4" />
              {t("country.immigration_site", "출입국 관리 사이트 바로가기")}
              <ChevronRight className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {!travelInfo && (
        <div className="text-center py-4 text-muted-foreground border-t border-border">
          <Info className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t("country.no_travel_info", "상세 여행 정보가 아직 등록되지 않았습니다")}</p>
        </div>
      )}
    </div>
  );
}
