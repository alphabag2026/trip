import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Globe, MapPin, Phone, Thermometer, Banknote, Clock, Wifi,
  AlertTriangle, Loader2, Copy, ExternalLink, Plug, Languages,
  Utensils, ShieldCheck, Ambulance, Building2, Train,
  CloudSun, CloudRain, Cloud, Sun, Wind, Droplets,
  TrendingUp, TrendingDown, ArrowUpDown, RefreshCw,
  Hotel, Plus, Pencil, Trash2, CalendarDays, DoorOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// 날씨 코드 → 아이콘/설명 매핑
const WEATHER_CODES: Record<number, { icon: any; label: string }> = {
  0: { icon: Sun, label: "맑음" },
  1: { icon: Sun, label: "대체로 맑음" },
  2: { icon: Cloud, label: "부분 흐림" },
  3: { icon: Cloud, label: "흐림" },
  45: { icon: Cloud, label: "안개" },
  48: { icon: Cloud, label: "짙은 안개" },
  51: { icon: CloudRain, label: "이슬비" },
  53: { icon: CloudRain, label: "이슬비" },
  55: { icon: CloudRain, label: "이슬비" },
  61: { icon: CloudRain, label: "비" },
  63: { icon: CloudRain, label: "비" },
  65: { icon: CloudRain, label: "폭우" },
  71: { icon: CloudSun, label: "눈" },
  73: { icon: CloudSun, label: "눈" },
  75: { icon: CloudSun, label: "폭설" },
  80: { icon: CloudRain, label: "소나기" },
  81: { icon: CloudRain, label: "소나기" },
  82: { icon: CloudRain, label: "강한 소나기" },
  95: { icon: CloudRain, label: "뇌우" },
  96: { icon: CloudRain, label: "우박 뇌우" },
  99: { icon: CloudRain, label: "강한 우박 뇌우" },
};

const CURRENCY_OPTIONS = [
  { code: "KRW", name: "한국 원", flag: "🇰🇷" },
  { code: "THB", name: "태국 바트", flag: "🇹🇭" },
  { code: "VND", name: "베트남 동", flag: "🇻🇳" },
  { code: "JPY", name: "일본 엔", flag: "🇯🇵" },
  { code: "CNY", name: "중국 위안", flag: "🇨🇳" },
  { code: "PHP", name: "필리핀 페소", flag: "🇵🇭" },
  { code: "IDR", name: "인도네시아 루피아", flag: "🇮🇩" },
  { code: "MYR", name: "말레이시아 링깃", flag: "🇲🇾" },
  { code: "SGD", name: "싱가포르 달러", flag: "🇸🇬" },
  { code: "EUR", name: "유로", flag: "🇪🇺" },
  { code: "GBP", name: "영국 파운드", flag: "🇬🇧" },
  { code: "AUD", name: "호주 달러", flag: "🇦🇺" },
  { code: "CAD", name: "캐나다 달러", flag: "🇨🇦" },
  { code: "CHF", name: "스위스 프랑", flag: "🇨🇭" },
  { code: "INR", name: "인도 루피", flag: "🇮🇳" },
  { code: "RUB", name: "러시아 루블", flag: "🇷🇺" },
  { code: "TRY", name: "터키 리라", flag: "🇹🇷" },
  { code: "AED", name: "UAE 디르함", flag: "🇦🇪" },
  { code: "MNT", name: "몽골 투그릭", flag: "🇲🇳" },
  { code: "MMK", name: "미얀마 짯", flag: "🇲🇲" },
  { code: "LAK", name: "라오스 킵", flag: "🇱🇦" },
  { code: "KHR", name: "캄보디아 리엘", flag: "🇰🇭" },
];

export default function TravelInfoTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [currency1, setCurrency1] = useState("KRW");
  const [currency2, setCurrency2] = useState("THB");
  const [showAccommodationForm, setShowAccommodationForm] = useState(false);
  const [editingAccommodation, setEditingAccommodation] = useState<any>(null);

  const travelInfoQuery = trpc.myTravel.travelInfo.useQuery(undefined, { enabled: !!user });
  const weatherQuery = trpc.myTravel.weather.useQuery(undefined, { enabled: !!user });
  const exchangeQuery = trpc.myTravel.exchangeRates.useQuery({ currency1, currency2 }, { enabled: !!user });
  const accommodationsQuery = trpc.myTravel.myAccommodationInfo.useQuery(undefined, { enabled: !!user });
  const saveAccommodationMutation = trpc.myTravel.saveAccommodation.useMutation({
    onSuccess: () => {
      toast.success(t("myPage.accommodationSaved", "숙박 정보가 저장되었습니다"));
      accommodationsQuery.refetch();
      setShowAccommodationForm(false);
      setEditingAccommodation(null);
    },
    onError: () => toast.error(t("myPage.saveFailed", "저장 실패")),
  });
  const deleteAccommodationMutation = trpc.myTravel.deleteAccommodation.useMutation({
    onSuccess: () => {
      toast.success(t("myPage.accommodationDeleted", "삭제되었습니다"));
      accommodationsQuery.refetch();
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("myPage.copied", "복사되었습니다"));
  };

  if (travelInfoQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const info = travelInfoQuery.data;

  return (
    <div className="space-y-4">
      {/* 실시간 날씨 */}
      <WeatherCard data={weatherQuery.data} isLoading={weatherQuery.isLoading} t={t} />

      {/* 환율 정보 (USDT + 지정 2개 통화) */}
      <ExchangeRateCard
        data={exchangeQuery.data}
        isLoading={exchangeQuery.isLoading}
        currency1={currency1}
        currency2={currency2}
        setCurrency1={setCurrency1}
        setCurrency2={setCurrency2}
        onRefresh={() => exchangeQuery.refetch()}
        t={t}
      />

      {/* 숙박 정보 직접 입력 */}
      <AccommodationCard
        accommodations={accommodationsQuery.data || []}
        isLoading={accommodationsQuery.isLoading}
        showForm={showAccommodationForm}
        setShowForm={setShowAccommodationForm}
        editingAccommodation={editingAccommodation}
        setEditingAccommodation={setEditingAccommodation}
        onSave={(data: any) => saveAccommodationMutation.mutate(data)}
        onDelete={(id: number) => {
          if (confirm(t("myPage.confirmDelete", "삭제하시겠습니까?"))) {
            deleteAccommodationMutation.mutate({ id });
          }
        }}
        isSaving={saveAccommodationMutation.isPending}
        t={t}
      />

      {/* 기본 여행지 정보 */}
      {info && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                {info.city}, {info.country}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={Clock} label={t("myPage.timezone", "시간대")} value={info.timezone} color="text-blue-500" bgColor="bg-blue-50 dark:bg-blue-950/30" />
                <InfoCard icon={Banknote} label={t("myPage.currency", "통화")} value={`${info.currency} (${info.currencySymbol})`} color="text-emerald-500" bgColor="bg-emerald-50 dark:bg-emerald-950/30" />
                <InfoCard icon={Languages} label={t("myPage.localLanguage", "현지 언어")} value={info.language} color="text-purple-500" bgColor="bg-purple-50 dark:bg-purple-950/30" />
                <InfoCard icon={Plug} label={t("myPage.electricPlug", "전기 플러그")} value={`${info.electricPlug} / ${info.voltage}`} color="text-amber-500" bgColor="bg-amber-50 dark:bg-amber-950/30" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ambulance className="w-5 h-5 text-red-500" />
                {t("myPage.emergencyContacts", "긴급 연락처")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <EmergencyRow icon={Phone} label={t("myPage.emergencyGeneral", "긴급 전화")} number={info.emergencyNumber} color="text-red-500" onCopy={copyToClipboard} />
              <EmergencyRow icon={ShieldCheck} label={t("myPage.police", "경찰")} number={info.policeNumber} color="text-blue-500" onCopy={copyToClipboard} />
              <EmergencyRow icon={Ambulance} label={t("myPage.ambulance", "구급차")} number={info.ambulanceNumber} color="text-red-500" onCopy={copyToClipboard} />
              {info.embassyPhone && (
                <EmergencyRow icon={Building2} label={t("myPage.embassy", "대사관")} number={info.embassyPhone} color="text-indigo-500" onCopy={copyToClipboard} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {t("myPage.practicalInfo", "실용 정보")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <PracticalRow icon={Utensils} label={t("myPage.tipping", "팁 문화")} value={info.tipping} />
              <PracticalRow icon={Thermometer} label={t("myPage.waterSafety", "수돗물")} value={info.waterSafety} />
              {info.visaInfo && <PracticalRow icon={Globe} label={t("myPage.visaInfo", "비자 정보")} value={info.visaInfo} />}
              {info.transportTips && <PracticalRow icon={Train} label={t("myPage.transportTips", "교통 팁")} value={info.transportTips} />}
              {info.wifiInfo && <PracticalRow icon={Wifi} label={t("myPage.wifiInfo", "와이파이/SIM")} value={info.wifiInfo} />}
            </CardContent>
          </Card>

          {info.usefulLinks && info.usefulLinks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-primary" />
                  {t("myPage.usefulLinks", "유용한 링크")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {info.usefulLinks.map((link: any, i: number) => (
                  <Button key={i} variant="outline" className="w-full justify-start gap-2" onClick={() => window.open(link.url, "_blank")}>
                    <ExternalLink className="w-4 h-4 text-primary" />
                    <span className="truncate">{link.title}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!info && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t("myPage.noTravelInfo", "여행지 정보가 없습니다. 밋업에 등록하면 여행지 정보가 표시됩니다.")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── 실시간 날씨 카드 ──────────────────────────────────────────────
function WeatherCard({ data, isLoading, t }: { data: any; isLoading: boolean; t: any }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const current = data.current;
  const daily = data.daily;
  const weatherInfo = WEATHER_CODES[current?.weather_code] || { icon: Cloud, label: "알 수 없음" };
  const WeatherIcon = weatherInfo.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <CloudSun className="w-5 h-5 text-sky-500" />
          {t("myPage.weather", "실시간 날씨")} - {data.city}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 현재 날씨 */}
        <div className="flex items-center justify-between bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <WeatherIcon className="w-10 h-10 text-sky-500" />
            <div>
              <p className="text-2xl font-bold">{current?.temperature_2m}°C</p>
              <p className="text-sm text-muted-foreground">{weatherInfo.label}</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Thermometer className="w-3 h-3" />
              <span>{t("myPage.feelsLike", "체감")} {current?.apparent_temperature}°C</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Droplets className="w-3 h-3" />
              <span>{t("myPage.humidity", "습도")} {current?.relative_humidity_2m}%</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wind className="w-3 h-3" />
              <span>{t("myPage.wind", "풍속")} {current?.wind_speed_10m}km/h</span>
            </div>
          </div>
        </div>

        {/* 5일 예보 */}
        {daily && (
          <div className="grid grid-cols-5 gap-2">
            {daily.time?.slice(0, 5).map((date: string, i: number) => {
              const dayWeather = WEATHER_CODES[daily.weather_code?.[i]] || { icon: Cloud, label: "" };
              const DayIcon = dayWeather.icon;
              const dayName = new Date(date).toLocaleDateString("ko-KR", { weekday: "short" });
              return (
                <div key={date} className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">{dayName}</p>
                  <DayIcon className="w-5 h-5 mx-auto my-1 text-sky-500" />
                  <p className="text-xs font-medium">
                    {Math.round(daily.temperature_2m_max?.[i])}° / {Math.round(daily.temperature_2m_min?.[i])}°
                  </p>
                  {daily.precipitation_probability_max?.[i] > 0 && (
                    <p className="text-[10px] text-blue-500">{daily.precipitation_probability_max[i]}%</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── 환율 카드 (USDT + 지정 2개 통화) ──────────────────────────────
function ExchangeRateCard({ data, isLoading, currency1, currency2, setCurrency1, setCurrency2, onRefresh, t }: {
  data: any; isLoading: boolean; currency1: string; currency2: string;
  setCurrency1: (v: string) => void; setCurrency2: (v: string) => void;
  onRefresh: () => void; t: any;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-500" />
            {t("myPage.exchangeRate", "환율 정보")}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 통화 선택 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("myPage.currency1", "통화 1")}</label>
            <Select value={currency1} onValueChange={setCurrency1}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {CURRENCY_OPTIONS.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="mr-1">{c.flag}</span> {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("myPage.currency2", "통화 2")}</label>
            <Select value={currency2} onValueChange={setCurrency2}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {CURRENCY_OPTIONS.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="mr-1">{c.flag}</span> {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            {/* USDT */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">₮</div>
                  <div>
                    <p className="text-sm font-medium">USDT (Tether)</p>
                    <p className="text-xs text-muted-foreground">1 USDT</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">${data.usdt?.usd?.toFixed(4) || "1.0000"}</p>
                </div>
              </div>
              {data.usdt && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {data.usdt[currency1.toLowerCase()] && (
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg px-2 py-1">
                      <span className="text-muted-foreground">1 USDT = </span>
                      <span className="font-medium">{Number(data.usdt[currency1.toLowerCase()]).toLocaleString()} {currency1}</span>
                    </div>
                  )}
                  {data.usdt[currency2.toLowerCase()] && (
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg px-2 py-1">
                      <span className="text-muted-foreground">1 USDT = </span>
                      <span className="font-medium">{Number(data.usdt[currency2.toLowerCase()]).toLocaleString()} {currency2}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 통화 1 */}
            {data.rates?.[currency1] && (
              <RateRow
                code={currency1}
                rate={data.rates[currency1]}
                flag={CURRENCY_OPTIONS.find(c => c.code === currency1)?.flag || ""}
                name={CURRENCY_OPTIONS.find(c => c.code === currency1)?.name || currency1}
              />
            )}

            {/* 통화 2 */}
            {data.rates?.[currency2] && (
              <RateRow
                code={currency2}
                rate={data.rates[currency2]}
                flag={CURRENCY_OPTIONS.find(c => c.code === currency2)?.flag || ""}
                name={CURRENCY_OPTIONS.find(c => c.code === currency2)?.name || currency2}
              />
            )}

            {data.lastUpdate && (
              <p className="text-[10px] text-muted-foreground text-right">
                {t("myPage.lastUpdated", "마지막 업데이트")}: {new Date(data.lastUpdate).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">{t("myPage.exchangeRateUnavailable", "환율 정보를 불러올 수 없습니다")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RateRow({ code, rate, flag, name }: { code: string; rate: number; flag: string; name: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-lg">{flag}</span>
        <div>
          <p className="text-sm font-medium">{code}</p>
          <p className="text-xs text-muted-foreground">{name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold">1 USD = {rate.toLocaleString(undefined, { maximumFractionDigits: 2 })} {code}</p>
      </div>
    </div>
  );
}

// ── 숙박 정보 카드 ──────────────────────────────────────────────────
function AccommodationCard({ accommodations, isLoading, showForm, setShowForm, editingAccommodation, setEditingAccommodation, onSave, onDelete, isSaving, t }: {
  accommodations: any[]; isLoading: boolean; showForm: boolean; setShowForm: (v: boolean) => void;
  editingAccommodation: any; setEditingAccommodation: (v: any) => void;
  onSave: (data: any) => void; onDelete: (id: number) => void; isSaving: boolean; t: any;
}) {
  const [form, setForm] = useState({
    hotelName: "", hotelAddress: "", checkInDate: "", checkInTime: "",
    checkOutDate: "", checkOutTime: "", bookingId: "", roomType: "", phone: "", notes: "",
  });

  const openEditForm = (acc: any) => {
    setEditingAccommodation(acc);
    setForm({
      hotelName: acc.hotelName || "",
      hotelAddress: acc.hotelAddress || "",
      checkInDate: acc.checkInDate || "",
      checkInTime: acc.checkInTime || "",
      checkOutDate: acc.checkOutDate || "",
      checkOutTime: acc.checkOutTime || "",
      bookingId: acc.bookingId || "",
      roomType: acc.roomType || "",
      phone: acc.phone || "",
      notes: acc.notes || "",
    });
    setShowForm(true);
  };

  const openNewForm = () => {
    setEditingAccommodation(null);
    setForm({ hotelName: "", hotelAddress: "", checkInDate: "", checkInTime: "", checkOutDate: "", checkOutTime: "", bookingId: "", roomType: "", phone: "", notes: "" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.hotelName.trim()) { toast.error(t("myPage.hotelNameRequired", "호텔명을 입력해주세요")); return; }
    onSave({ ...form, id: editingAccommodation?.id });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-indigo-500" />
            {t("myPage.myAccommodation", "내 숙박 정보")}
          </CardTitle>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={openNewForm}>
            <Plus className="w-3.5 h-3.5" />
            {t("myPage.addAccommodation", "추가")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : accommodations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Hotel className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("myPage.noAccommodation", "등록된 숙박 정보가 없습니다")}</p>
            <p className="text-xs mt-1">{t("myPage.addAccommodationHint", "호텔/숙소 정보를 직접 입력해보세요")}</p>
          </div>
        ) : (
          accommodations.map((acc: any) => (
            <div key={acc.id} className="p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{acc.hotelName}</p>
                  {acc.hotelAddress && <p className="text-xs text-muted-foreground mt-0.5">{acc.hotelAddress}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {acc.checkInDate && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <DoorOpen className="w-3 h-3" />
                        {t("myPage.checkIn", "체크인")}: {acc.checkInDate} {acc.checkInTime || ""}
                      </Badge>
                    )}
                    {acc.checkOutDate && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {t("myPage.checkOut", "체크아웃")}: {acc.checkOutDate} {acc.checkOutTime || ""}
                      </Badge>
                    )}
                    {acc.roomType && <Badge variant="secondary" className="text-[10px]">{acc.roomType}</Badge>}
                    {acc.bookingId && <Badge variant="secondary" className="text-[10px]">#{acc.bookingId}</Badge>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditForm(acc)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => onDelete(acc.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* 입력 폼 다이얼로그 */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Hotel className="w-5 h-5" />
                {editingAccommodation ? t("myPage.editAccommodation", "숙박 정보 수정") : t("myPage.addNewAccommodation", "숙박 정보 등록")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">{t("myPage.hotelName", "호텔/숙소명")} *</label>
                <Input value={form.hotelName} onChange={e => setForm(p => ({ ...p, hotelName: e.target.value }))} placeholder="Hotel name" />
              </div>
              <div>
                <label className="text-xs font-medium">{t("myPage.hotelAddress", "주소")}</label>
                <Input value={form.hotelAddress} onChange={e => setForm(p => ({ ...p, hotelAddress: e.target.value }))} placeholder="Address" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">{t("myPage.checkInDate", "체크인 날짜")}</label>
                  <Input type="date" value={form.checkInDate} onChange={e => setForm(p => ({ ...p, checkInDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">{t("myPage.checkInTime", "체크인 시간")}</label>
                  <Input type="time" value={form.checkInTime} onChange={e => setForm(p => ({ ...p, checkInTime: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">{t("myPage.checkOutDate", "체크아웃 날짜")}</label>
                  <Input type="date" value={form.checkOutDate} onChange={e => setForm(p => ({ ...p, checkOutDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">{t("myPage.checkOutTime", "체크아웃 시간")}</label>
                  <Input type="time" value={form.checkOutTime} onChange={e => setForm(p => ({ ...p, checkOutTime: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">{t("myPage.bookingId", "예약번호")}</label>
                  <Input value={form.bookingId} onChange={e => setForm(p => ({ ...p, bookingId: e.target.value }))} placeholder="Booking ID" />
                </div>
                <div>
                  <label className="text-xs font-medium">{t("myPage.roomType", "객실 타입")}</label>
                  <Input value={form.roomType} onChange={e => setForm(p => ({ ...p, roomType: e.target.value }))} placeholder="Deluxe, Twin..." />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">{t("myPage.hotelPhone", "호텔 전화번호")}</label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+66-2-xxx-xxxx" />
              </div>
              <div>
                <label className="text-xs font-medium">{t("myPage.notes", "메모")}</label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="추가 메모..." rows={2} />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingAccommodation ? t("myPage.update", "수정") : t("myPage.save", "저장")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ── 공통 컴포넌트 ──────────────────────────────────────────────────
function InfoCard({ icon: Icon, label, value, color, bgColor }: {
  icon: any; label: string; value: string; color: string; bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function EmergencyRow({ icon: Icon, label, number, color, onCopy }: {
  icon: any; label: string; number: string; color: string; onCopy: (text: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <a href={`tel:${number}`} className="text-sm text-primary hover:underline">{number}</a>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onCopy(number)}>
        <Copy className="w-4 h-4" />
      </Button>
    </div>
  );
}

function PracticalRow({ icon: Icon, label, value }: {
  icon: any; label: string; value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
