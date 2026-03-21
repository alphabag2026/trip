import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plane, Hotel, Search, ExternalLink, Send, Clock, Users,
  ArrowRight, Globe, Star, ChevronDown, ChevronUp, Loader2,
  History, CheckCircle2, TrendingUp, Settings, Save, Power, PowerOff
} from "lucide-react";

// Affiliate Platform Config
const AFFILIATE_PLATFORMS = [
  {
    key: "trip_com",
    name: "Trip.com",
    signupUrl: "https://www.trip.com/partners/",
    description: "항공+호텔+투어 통합. 아시아 최대 OTA. 커미션 0.5~7%",
    descEn: "Flights+Hotels+Tours. Asia's largest OTA. Commission 0.5~7%",
    fields: ["affiliateId", "apiKey"],
  },
  {
    key: "booking_com",
    name: "Booking.com",
    signupUrl: "https://www.booking.com/affiliate-program/v2/index.html",
    description: "글로벌 최대 숙박 예약. 28M+ 숙소. 커미션 약 4%",
    descEn: "World's largest accommodation. 28M+ listings. Commission ~4%",
    fields: ["affiliateId"],
  },
  {
    key: "agoda",
    name: "Agoda",
    signupUrl: "https://partners.agoda.com/",
    description: "아시아 호텔 특화. 커미션 4~6%",
    descEn: "Asia hotel specialist. Commission 4~6%",
    fields: ["affiliateId", "apiKey"],
  },
  {
    key: "skyscanner",
    name: "Skyscanner",
    signupUrl: "https://www.partners.skyscanner.net/",
    description: "항공 비교 검색 특화. CPC 성과 기반",
    descEn: "Flight comparison specialist. CPC-based",
    fields: ["affiliateId", "apiKey"],
  },
  {
    key: "klook",
    name: "Klook",
    signupUrl: "https://affiliate.klook.com/",
    description: "투어/액티비티/교통 특화. 커미션 3~5%",
    descEn: "Tours/Activities/Transport. Commission 3~5%",
    fields: ["affiliateId"],
  },
  {
    key: "travelpayouts",
    name: "Travelpayouts",
    signupUrl: "https://www.travelpayouts.com/",
    description: "50+ 브랜드 통합 어필리에이트. 항공+호텔+렌터카",
    descEn: "50+ brands integrated. Flights+Hotels+Car Rental",
    fields: ["affiliateId", "apiKey", "marker"],
  },
];

export default function BookingSearch() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("flight");
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);

  // Flight search state
  const [flightOrigin, setFlightOrigin] = useState("ICN");
  const [flightDest, setFlightDest] = useState("");
  const [flightDepDate, setFlightDepDate] = useState("");
  const [flightRetDate, setFlightRetDate] = useState("");
  const [flightPax, setFlightPax] = useState(1);
  const [flightCabin, setFlightCabin] = useState<"economy" | "business" | "first">("economy");
  const [flightMeetupId, setFlightMeetupId] = useState<number | undefined>();

  // Hotel search state
  const [hotelCity, setHotelCity] = useState("");
  const [hotelCheckIn, setHotelCheckIn] = useState("");
  const [hotelCheckOut, setHotelCheckOut] = useState("");
  const [hotelRooms, setHotelRooms] = useState(1);
  const [hotelGuests, setHotelGuests] = useState(2);
  const [hotelMeetupId, setHotelMeetupId] = useState<number | undefined>();

  // Results
  const [flightResults, setFlightResults] = useState<any>(null);
  const [hotelResults, setHotelResults] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Affiliate settings
  const affiliateSettings = trpc.affiliate.settings.useQuery();
  const upsertSetting = trpc.affiliate.upsertSetting.useMutation({
    onSuccess: () => {
      toast.success(t("admin.booking.settingSaved", "설정이 저장되었습니다"));
      affiliateSettings.refetch();
      setEditingPlatform(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // Queries
  const airports = trpc.booking.airports.useQuery();
  const meetups = trpc.meetup.list.useQuery();
  const searchHistory = trpc.booking.searchHistory.useQuery(
    { limit: 20 },
    { enabled: showHistory }
  );

  // Mutations
  const searchFlights = trpc.booking.searchFlights.useMutation({
    onSuccess: (data) => {
      setFlightResults(data);
      toast.success(`${t("admin.booking.searchComplete")}: ${data.platforms.length} ${t("admin.booking.platformsFound")}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const searchHotels = trpc.booking.searchHotels.useMutation({
    onSuccess: (data) => {
      setHotelResults(data);
      toast.success(`${t("admin.booking.searchComplete")}: ${data.platforms.length} ${t("admin.booking.platformsFound")}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const sendToAttendees = trpc.booking.sendToAttendees.useMutation({
    onSuccess: (data) => {
      toast.success(`${t("admin.booking.sentSuccess")}: ${data.recipientCount} ${t("admin.booking.recipientsSent")}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFlightSearch = () => {
    if (!flightDest || !flightDepDate) {
      toast.error(t("admin.booking.fillRequired"));
      return;
    }
    searchFlights.mutate({
      origin: flightOrigin,
      destination: flightDest,
      departureDate: flightDepDate,
      returnDate: flightRetDate || undefined,
      passengers: flightPax,
      cabinClass: flightCabin,
      meetupId: flightMeetupId,
      source: "backoffice",
    });
  };

  const handleHotelSearch = () => {
    if (!hotelCity || !hotelCheckIn || !hotelCheckOut) {
      toast.error(t("admin.booking.fillRequired"));
      return;
    }
    searchHotels.mutate({
      city: hotelCity,
      checkIn: hotelCheckIn,
      checkOut: hotelCheckOut,
      rooms: hotelRooms,
      guests: hotelGuests,
      meetupId: hotelMeetupId,
      source: "backoffice",
    });
  };

  const handleSendToAttendees = (searchId: number, meetupId?: number) => {
    if (!meetupId) {
      toast.error(t("admin.booking.selectMeetup"));
      return;
    }
    sendToAttendees.mutate({ searchId, meetupId });
  };

  // Meetup auto-fill
  const handleMeetupSelect = (meetupId: string, type: "flight" | "hotel") => {
    const id = parseInt(meetupId);
    const meetup = meetups.data?.find((m: any) => m.id === id);
    if (type === "flight") {
      setFlightMeetupId(id);
      if (meetup?.location) setFlightDest(meetup.location);
    } else {
      setHotelMeetupId(id);
      if (meetup?.location) setHotelCity(meetup.location);
    }
  };

  const platformColors: Record<string, string> = {
    trip_com: "bg-blue-600",
    booking_com: "bg-blue-900",
    agoda: "bg-purple-600",
    skyscanner: "bg-sky-600",
    klook: "bg-orange-500",
    travelpayouts: "bg-orange-600",
  };

  const airportOptions = useMemo(() => {
    return airports.data?.map(a => ({ value: a.code, label: `${a.code} - ${a.cityKo}` })) || [];
  }, [airports.data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-500" />
            {t("admin.booking.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("admin.booking.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          {t("admin.booking.searchHistory")}
          {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Search History */}
      {showHistory && searchHistory.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("admin.booking.recentSearches")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchHistory.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("admin.booking.noHistory")}</p>
              ) : (
                searchHistory.data.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                    <div className="flex items-center gap-2">
                      {s.searchType === "flight" ? <Plane className="h-4 w-4 text-blue-500" /> : <Hotel className="h-4 w-4 text-purple-500" />}
                      <span>
                        {s.searchType === "flight"
                          ? `${s.originCode} \u2192 ${s.destinationCode} (${s.departureDate})`
                          : `${s.hotelCity} (${s.hotelCheckIn} ~ ${s.hotelCheckOut})`}
                      </span>
                      <Badge variant="outline" className="text-xs">{s.source}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{s.resultCount} {t("admin.booking.results")}</span>
                      {s.sentToAttendees && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="flight" className="gap-2">
            <Plane className="h-4 w-4" /> {t("admin.booking.flightSearch")}
          </TabsTrigger>
          <TabsTrigger value="hotel" className="gap-2">
            <Hotel className="h-4 w-4" /> {t("admin.booking.hotelSearch")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" /> {t("admin.booking.settings", "설정")}
          </TabsTrigger>
        </TabsList>

        {/* Flight Search */}
        <TabsContent value="flight">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-blue-500" />
                {t("admin.booking.flightSearchTitle")}
              </CardTitle>
              <CardDescription>{t("admin.booking.flightSearchDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Meetup Selection */}
              <div>
                <Label>{t("admin.booking.linkedMeetup")}</Label>
                <Select onValueChange={(v) => handleMeetupSelect(v, "flight")}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.booking.selectMeetupOptional")} />
                  </SelectTrigger>
                  <SelectContent>
                    {meetups.data?.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>{t("admin.booking.origin")}</Label>
                  <Select value={flightOrigin} onValueChange={setFlightOrigin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {airportOptions.map(a => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("admin.booking.destination")}</Label>
                  <Select value={flightDest} onValueChange={setFlightDest}>
                    <SelectTrigger><SelectValue placeholder={t("admin.booking.selectDestination")} /></SelectTrigger>
                    <SelectContent>
                      {airportOptions.map(a => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("admin.booking.departureDate")}</Label>
                  <Input type="date" value={flightDepDate} onChange={e => setFlightDepDate(e.target.value)} />
                </div>
                <div>
                  <Label>{t("admin.booking.returnDate")}</Label>
                  <Input type="date" value={flightRetDate} onChange={e => setFlightRetDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>{t("admin.booking.passengers")}</Label>
                  <Input type="number" min={1} max={9} value={flightPax} onChange={e => setFlightPax(parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <Label>{t("admin.booking.cabinClass")}</Label>
                  <Select value={flightCabin} onValueChange={(v: any) => setFlightCabin(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">{t("admin.booking.economy")}</SelectItem>
                      <SelectItem value="business">{t("admin.booking.business")}</SelectItem>
                      <SelectItem value="first">{t("admin.booking.first")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleFlightSearch} disabled={searchFlights.isPending} className="w-full gap-2">
                    {searchFlights.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {t("admin.booking.searchFlights")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flight Results */}
          {flightResults && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  {flightResults.origin.cityKo} <ArrowRight className="h-4 w-4" /> {flightResults.destination.cityKo}
                </h2>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleSendToAttendees(flightResults.searchId, flightMeetupId)}
                  disabled={sendToAttendees.isPending || !flightMeetupId}
                >
                  <Send className="h-4 w-4" />
                  {t("admin.booking.sendToAttendees")}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {flightResults.platforms.map((p: any, i: number) => (
                  <PlatformCard key={i} platform={p} colors={platformColors} t={t} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Hotel Search */}
        <TabsContent value="hotel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hotel className="h-5 w-5 text-purple-500" />
                {t("admin.booking.hotelSearchTitle")}
              </CardTitle>
              <CardDescription>{t("admin.booking.hotelSearchDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("admin.booking.linkedMeetup")}</Label>
                <Select onValueChange={(v) => handleMeetupSelect(v, "hotel")}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.booking.selectMeetupOptional")} />
                  </SelectTrigger>
                  <SelectContent>
                    {meetups.data?.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>{t("admin.booking.city")}</Label>
                  <Input value={hotelCity} onChange={e => setHotelCity(e.target.value)} placeholder={t("admin.booking.cityPlaceholder")} />
                </div>
                <div>
                  <Label>{t("admin.booking.checkIn")}</Label>
                  <Input type="date" value={hotelCheckIn} onChange={e => setHotelCheckIn(e.target.value)} />
                </div>
                <div>
                  <Label>{t("admin.booking.checkOut")}</Label>
                  <Input type="date" value={hotelCheckOut} onChange={e => setHotelCheckOut(e.target.value)} />
                </div>
                <div>
                  <Label>{t("admin.booking.rooms")}</Label>
                  <Input type="number" min={1} max={20} value={hotelRooms} onChange={e => setHotelRooms(parseInt(e.target.value) || 1)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>{t("admin.booking.guests")}</Label>
                  <Input type="number" min={1} max={50} value={hotelGuests} onChange={e => setHotelGuests(parseInt(e.target.value) || 2)} />
                </div>
                <div className="flex items-end col-span-2">
                  <Button onClick={handleHotelSearch} disabled={searchHotels.isPending} className="w-full gap-2">
                    {searchHotels.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {t("admin.booking.searchHotels")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hotel Results */}
          {hotelResults && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-purple-500" />
                  {hotelCity} {t("admin.booking.hotelResults")}
                </h2>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleSendToAttendees(hotelResults.searchId, hotelMeetupId)}
                  disabled={sendToAttendees.isPending || !hotelMeetupId}
                >
                  <Send className="h-4 w-4" />
                  {t("admin.booking.sendToAttendees")}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hotelResults.platforms.map((p: any, i: number) => (
                  <PlatformCard key={i} platform={p} colors={platformColors} t={t} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-500" />
                  {t("admin.booking.affiliateSettings", "어필리에이트 플랫폼 설정")}
                </CardTitle>
                <CardDescription>
                  {t("admin.booking.affiliateSettingsDesc", "각 제휴 플랫폼의 어필리에이트 ID, API 키, 커미션 비율을 설정하세요. 활성화된 플랫폼만 검색 결과에 표시됩니다.")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {AFFILIATE_PLATFORMS.map((p) => {
                    const setting = affiliateSettings.data?.find((s: any) => s.platform === p.key);
                    const isEditing = editingPlatform === p.key;
                    return (
                      <AffiliateSettingRow
                        key={p.key}
                        platform={p}
                        setting={setting}
                        isEditing={isEditing}
                        onEdit={() => setEditingPlatform(isEditing ? null : p.key)}
                        onSave={(data) => upsertSetting.mutate({ platform: p.key as any, ...data })}
                        isSaving={upsertSetting.isPending}
                        t={t}
                        colors={platformColors}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Guide */}
            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  {t("admin.booking.quickGuide", "가입 가이드")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {AFFILIATE_PLATFORMS.map((p) => (
                  <div key={p.key} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${platformColors[p.key] || "bg-gray-500"}`} />
                    <div>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground"> — </span>
                      <a href={p.signupUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {t("admin.booking.signupHere", "가입하기")} <ExternalLink className="h-3 w-3 inline" />
                      </a>
                      <p className="text-muted-foreground mt-0.5">{p.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Affiliate Setting Row Component
function AffiliateSettingRow({
  platform,
  setting,
  isEditing,
  onEdit,
  onSave,
  isSaving,
  t,
  colors,
}: {
  platform: (typeof AFFILIATE_PLATFORMS)[number];
  setting: any;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
  t: any;
  colors: Record<string, string>;
}) {
  const [formData, setFormData] = useState({
    affiliateId: setting?.affiliateId || "",
    apiKey: setting?.apiKey || "",
    apiSecret: setting?.apiSecret || "",
    marker: setting?.marker || "",
    isActive: setting?.isActive ?? false,
    commissionRateFlight: setting?.commissionRateFlight || "",
    commissionRateHotel: setting?.commissionRateHotel || "",
    commissionRateTour: setting?.commissionRateTour || "",
    notes: setting?.notes || "",
  });

  // Sync form data when setting changes
  useEffect(() => {
    if (setting) {
      setFormData({
        affiliateId: setting.affiliateId || "",
        apiKey: setting.apiKey || "",
        apiSecret: setting.apiSecret || "",
        marker: setting.marker || "",
        isActive: setting.isActive ?? false,
        commissionRateFlight: setting.commissionRateFlight || "",
        commissionRateHotel: setting.commissionRateHotel || "",
        commissionRateTour: setting.commissionRateTour || "",
        notes: setting.notes || "",
      });
    }
  }, [setting]);

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      isEditing ? "ring-2 ring-primary/30 shadow-md" : "hover:shadow-sm"
    }`}>
      {/* Header Row */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onEdit}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-8 rounded-full ${colors[platform.key] || "bg-gray-500"}`} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{platform.name}</h3>
              {setting?.isActive ? (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                  <Power className="h-3 w-3 mr-1" />
                  {t("admin.booking.active", "활성")}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  <PowerOff className="h-3 w-3 mr-1" />
                  {t("admin.booking.inactive", "비활성")}
                </Badge>
              )}
            </div>
            {setting?.affiliateId && (
              <p className="text-xs text-muted-foreground mt-0.5">
                ID: {setting.affiliateId}
                {setting.commissionRateFlight && ` \u00b7 ${t("admin.booking.flightRate", "항공")} ${setting.commissionRateFlight}%`}
                {setting.commissionRateHotel && ` \u00b7 ${t("admin.booking.hotelRate", "호텔")} ${setting.commissionRateHotel}%`}
              </p>
            )}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isEditing ? "rotate-180" : ""}`} />
      </div>

      {/* Expanded Edit Form */}
      {isEditing && (
        <div className="px-4 pb-4 pt-2 border-t space-y-4 bg-muted/10">
          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              {t("admin.booking.enablePlatform", "플랫폼 활성화")}
            </Label>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(v) => setFormData(prev => ({ ...prev, isActive: v }))}
            />
          </div>

          <Separator />

          {/* ID & Key Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t("admin.booking.affiliateId", "어필리에이트 ID")}</Label>
              <Input
                value={formData.affiliateId}
                onChange={(e) => setFormData(prev => ({ ...prev, affiliateId: e.target.value }))}
                placeholder={`${platform.name} ${t("admin.booking.affiliateIdPlaceholder", "어필리에이트 ID 입력")}`}
              />
            </div>

            {platform.fields.includes("apiKey") && (
              <div>
                <Label>{t("admin.booking.apiKey", "API Key")}</Label>
                <Input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={t("admin.booking.apiKeyPlaceholder", "API Key 입력")}
                />
              </div>
            )}

            {platform.fields.includes("marker") && (
              <div>
                <Label>{t("admin.booking.marker", "Marker / Tracking ID")}</Label>
                <Input
                  value={formData.marker}
                  onChange={(e) => setFormData(prev => ({ ...prev, marker: e.target.value }))}
                  placeholder={t("admin.booking.markerPlaceholder", "Marker ID 입력")}
                />
              </div>
            )}
          </div>

          {/* Commission Rates */}
          <div>
            <Label className="text-sm font-medium mb-2 block">{t("admin.booking.commissionRates", "커미션 비율 (%)")}</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">{t("admin.booking.flightCommission", "항공권")}</Label>
                <Input
                  value={formData.commissionRateFlight}
                  onChange={(e) => setFormData(prev => ({ ...prev, commissionRateFlight: e.target.value }))}
                  placeholder="0.8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("admin.booking.hotelCommission", "호텔")}</Label>
                <Input
                  value={formData.commissionRateHotel}
                  onChange={(e) => setFormData(prev => ({ ...prev, commissionRateHotel: e.target.value }))}
                  placeholder="4.0"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("admin.booking.tourCommission", "투어/액티비티")}</Label>
                <Input
                  value={formData.commissionRateTour}
                  onChange={(e) => setFormData(prev => ({ ...prev, commissionRateTour: e.target.value }))}
                  placeholder="5.0"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>{t("admin.booking.notes", "메모")}</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t("admin.booking.notesPlaceholder", "참고 사항 입력 (선택)")}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={() => onSave(formData)} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("admin.booking.saveSetting", "저장")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Platform Result Card Component
function PlatformCard({ platform, colors, t }: { platform: any; colors: Record<string, string>; t: any }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className={`h-2 ${colors[platform.platform] || "bg-gray-500"}`} />
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{platform.platformName}</h3>
          <Badge variant="secondary" className="text-xs">
            {platform.currency}
          </Badge>
        </div>

        <div className="space-y-1">
          {platform.features.map((f: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-3 w-3 text-yellow-500" />
              {f}
            </div>
          ))}
        </div>

        <Separator />

        <Button
          className="w-full gap-2"
          onClick={() => window.open(platform.url, "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
          {t("admin.booking.viewOnPlatform")}
        </Button>
      </CardContent>
    </Card>
  );
}
