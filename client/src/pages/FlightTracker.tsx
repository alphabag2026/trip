import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plane, ArrowLeft, Luggage, Upload, QrCode, Clock, MapPin,
  CheckCircle2, AlertTriangle, Search, RefreshCw, DoorOpen, Armchair
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import LanguageSelector from "@/components/LanguageSelector";

export default function FlightTracker() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [uploadingBaggage, setUploadingBaggage] = useState<number | null>(null);

  const baggageStatusLabels: Record<string, { label: string; color: string; icon: string }> = {
    checked_in: { label: t("tracker.bs_checkedIn", "체크인 완료"), color: "bg-blue-500/20 text-blue-400", icon: "📦" },
    loaded: { label: t("tracker.bs_loaded", "탑재 완료"), color: "bg-cyan-500/20 text-cyan-400", icon: "✈️" },
    in_transit: { label: t("tracker.bs_inTransit", "운송 중"), color: "bg-yellow-500/20 text-yellow-400", icon: "🚚" },
    arrived: { label: t("tracker.bs_arrived", "도착"), color: "bg-green-500/20 text-green-400", icon: "📍" },
    claimed: { label: t("tracker.bs_claimed", "수령 완료"), color: "bg-emerald-500/20 text-emerald-400", icon: "✅" },
    delayed: { label: t("tracker.bs_delayed", "지연"), color: "bg-orange-500/20 text-orange-400", icon: "⏳" },
    lost: { label: t("tracker.bs_lost", "분실"), color: "bg-red-500/20 text-red-400", icon: "❌" },
  };

  const flightStatusLabels: Record<string, { label: string; color: string }> = {
    scheduled: { label: t("lookup.fs_scheduled"), color: "bg-slate-500/20 text-slate-400" },
    boarding: { label: t("tracker.fs_boarding", "탑승 중"), color: "bg-blue-500/20 text-blue-400" },
    departed: { label: t("lookup.fs_departed"), color: "bg-cyan-500/20 text-cyan-400" },
    in_air: { label: t("lookup.fs_inair"), color: "bg-sky-500/20 text-sky-400" },
    landed: { label: t("lookup.fs_landed"), color: "bg-green-500/20 text-green-400" },
    delayed: { label: t("lookup.fs_delayed"), color: "bg-orange-500/20 text-orange-400" },
    cancelled: { label: t("lookup.fs_cancelled"), color: "bg-red-500/20 text-red-400" },
  };

  const checkinStatusLabels: Record<string, { label: string; color: string }> = {
    not_checked_in: { label: t("tracker.cs_notCheckedIn", "미체크인"), color: "bg-slate-500/20 text-slate-400" },
    online_checkin: { label: t("tracker.cs_onlineCheckin", "온라인 체크인"), color: "bg-blue-500/20 text-blue-400" },
    counter_checkin: { label: t("tracker.cs_counterCheckin", "카운터 체크인"), color: "bg-cyan-500/20 text-cyan-400" },
    boarding_pass_issued: { label: t("tracker.cs_boardingPass", "탑승권 발급"), color: "bg-green-500/20 text-green-400" },
    boarded: { label: t("tracker.cs_boarded", "탑승 완료"), color: "bg-emerald-500/20 text-emerald-400" },
  };

  const { data: lookupData } = trpc.registration.lookup.useQuery(
    { name, phone },
    { enabled: searched && !!name && !!phone }
  );

  const reg = lookupData?.[0];

  const { data: flights, refetch: refetchFlights } = trpc.flight.getByRegistration.useQuery(
    { registrationId: reg?.id! },
    { enabled: !!reg?.id, refetchInterval: 10000 }
  );

  const { data: baggage, refetch: refetchBaggage } = trpc.baggage.getByRegistration.useQuery(
    { registrationId: reg?.id! },
    { enabled: !!reg?.id, refetchInterval: 10000 }
  );

  const { data: checkins, refetch: refetchCheckins } = trpc.checkin.getByRegistration.useQuery(
    { registrationId: reg?.id! },
    { enabled: !!reg?.id, refetchInterval: 10000 }
  );

  const createBaggage = trpc.baggage.create.useMutation({
    onSuccess: () => { refetchBaggage(); toast.success(t("tracker.baggageRegistered", "수화물이 등록되었습니다.")); },
  });

  const uploadTagPhoto = trpc.baggage.uploadTagPhoto.useMutation({
    onSuccess: (data) => {
      refetchBaggage();
      if (data.tagNumber) {
        toast.success(`${t("tracker.tagRecognized", "태그 번호 인식")}: ${data.tagNumber}`);
      } else {
        toast.info(t("tracker.tagFailed", "사진이 업로드되었습니다. 태그 번호 인식에 실패했습니다."));
      }
      setUploadingBaggage(null);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) { toast.error(t("tracker.searchError", "이름과 전화번호를 입력해주세요.")); return; }
    setSearched(true);
  };

  const handleRefresh = () => {
    refetchFlights();
    refetchBaggage();
    refetchCheckins();
    toast.success(t("tracker.refreshed", "정보가 새로고침되었습니다."));
  };

  const handleAddBaggage = () => {
    if (!reg) return;
    createBaggage.mutate({ registrationId: reg.id, meetupId: reg.meetupId || undefined });
  };

  const handleTagPhotoUpload = useCallback((baggageId: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadTagPhoto.mutate({ baggageId, imageBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }, [uploadTagPhoto]);

  if (!searched || !reg) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
          <div className="container flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
              <Plane className="h-5 w-5 text-primary" />
              <span className="font-semibold">{t("tracker.title")}</span>
            </Link>
            <LanguageSelector />
          </div>
        </header>
        <div className="container max-w-md py-12">
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <Plane className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle>{t("tracker.title")}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{t("tracker.searchDesc", "신청 시 입력한 이름과 전화번호로 조회하세요")}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t("lookup.name")}</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder={t("lookup.namePh")} required />
                </div>
                <div>
                  <Label htmlFor="phone">{t("lookup.phone")}</Label>
                  <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("lookup.phonePh")} required />
                </div>
                <Button type="submit" className="w-full">
                  <Search className="h-4 w-4 mr-2" />{t("flightPickup.search")}
                </Button>
              </form>
              {searched && !reg && (
                <div className="mt-4 text-center text-sm text-muted-foreground">{t("lookup.noResult")}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <Plane className="h-5 w-5 text-primary" />
            <span className="font-semibold">{t("tracker.title")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />{t("tracker.refresh", "새로고침")}
            </Button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <div className="container max-w-2xl py-6">
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold">{reg.name[0]}</span>
          </div>
          <div>
            <p className="font-semibold">{reg.name}</p>
            <p className="text-xs text-muted-foreground">{reg.phone} · {reg.locationType === "overseas" ? t("register.overseas") : t("register.domestic")}</p>
          </div>
        </div>

        <Tabs defaultValue="flights" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="flights" className="text-xs">
              <Plane className="h-3.5 w-3.5 mr-1" />{t("tracker.tabFlights", "항공편")}
            </TabsTrigger>
            <TabsTrigger value="baggage" className="text-xs">
              <Luggage className="h-3.5 w-3.5 mr-1" />{t("tracker.tabBaggage", "수화물")}
            </TabsTrigger>
            <TabsTrigger value="checkin" className="text-xs">
              <DoorOpen className="h-3.5 w-3.5 mr-1" />{t("tracker.tabCheckin", "체크인")}
            </TabsTrigger>
          </TabsList>

          {/* Flights Tab */}
          <TabsContent value="flights" className="space-y-4">
            {(!flights || flights.length === 0) ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{t("tracker.noFlights", "등록된 항공편 정보가 없습니다.")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("tracker.noFlightsDesc", "관리자가 항공편을 배정하면 여기에 표시됩니다.")}</p>
                </CardContent>
              </Card>
            ) : flights.map((f: any) => (
              <Card key={f.id} className="bg-card border-border overflow-hidden">
                <div className={`h-1 ${f.flightStatus === "delayed" ? "bg-orange-500" : f.flightStatus === "cancelled" ? "bg-red-500" : f.flightStatus === "landed" ? "bg-green-500" : "bg-primary"}`} />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{f.flightNo}</span>
                      <span className="text-xs text-muted-foreground">{f.airline || ""}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${flightStatusLabels[f.flightStatus]?.color || "bg-slate-500/20"}`}>
                      {flightStatusLabels[f.flightStatus]?.label || f.flightStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground">{t("lookup.departure")}</p>
                      <p className="font-semibold">{f.departureAirport || "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.scheduledDeparture ? new Date(f.scheduledDeparture).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Plane className="h-5 w-5 text-primary rotate-90" />
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground">{t("lookup.arrival", "도착")}</p>
                      <p className="font-semibold">{f.arrivalAirport || "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.scheduledArrival ? new Date(f.scheduledArrival).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                      </p>
                    </div>
                  </div>
                  {f.delayMinutes > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                      <span className="text-sm text-orange-400">
                        {f.delayMinutes}{t("lookup.minDelay")}{f.actualDeparture ? ` · ${t("tracker.changedDeparture", "변경 출발")}: ${new Date(f.actualDeparture).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : ""}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className={`px-1.5 py-0.5 rounded ${f.direction === "outbound" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}>
                      {f.direction === "outbound" ? t("tracker.outbound", "출국편") : t("tracker.inbound", "귀국편")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Baggage Tab */}
          <TabsContent value="baggage" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold">{t("tracker.myBaggage", "내 수화물")}</h3>
              <Button size="sm" variant="outline" onClick={handleAddBaggage} disabled={createBaggage.isPending}>
                <Luggage className="h-3.5 w-3.5 mr-1" />{t("tracker.registerBaggage", "수화물 등록")}
              </Button>
            </div>

            {(!baggage || baggage.length === 0) ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Luggage className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{t("tracker.noBaggage", "등록된 수화물이 없습니다.")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("tracker.noBaggageDesc", "수화물을 등록하고 태그 사진을 업로드하면 추적할 수 있습니다.")}</p>
                </CardContent>
              </Card>
            ) : baggage.map((b: any) => {
              const status = baggageStatusLabels[b.baggageStatus] || { label: b.baggageStatus, color: "bg-slate-500/20 text-slate-400", icon: "📦" };
              return (
                <Card key={b.id} className="bg-card border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{status.icon}</span>
                        <div>
                          <p className="font-semibold">
                            {b.tagNumber ? `#${b.tagNumber}` : `${t("tracker.tabBaggage", "수화물")} ${b.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {b.baggageType || t("tracker.general", "일반")} {b.weight ? `· ${b.weight}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
                    </div>

                    {/* Status timeline */}
                    <div className="flex items-center gap-1">
                      {["checked_in", "loaded", "in_transit", "arrived", "claimed"].map((s, i) => {
                        const statusOrder = ["checked_in", "loaded", "in_transit", "arrived", "claimed"];
                        const currentIdx = statusOrder.indexOf(b.baggageStatus);
                        const isActive = i <= currentIdx && b.baggageStatus !== "delayed" && b.baggageStatus !== "lost";
                        return (
                          <div key={s} className="flex items-center flex-1">
                            <div className={`h-2 w-full rounded-full ${isActive ? "bg-primary" : "bg-secondary"}`} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{t("tracker.tl_checkin", "체크인")}</span>
                      <span>{t("tracker.tl_loaded", "탑재")}</span>
                      <span>{t("tracker.tl_transit", "운송")}</span>
                      <span>{t("tracker.tl_arrived", "도착")}</span>
                      <span>{t("tracker.tl_claimed", "수령")}</span>
                    </div>

                    {/* Tag photo */}
                    {b.tagPhotoUrl ? (
                      <div className="relative">
                        <img src={b.tagPhotoUrl} alt="" className="w-full h-32 object-cover rounded-lg" />
                        {b.ocrResult && (
                          <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg p-2 text-xs">
                            <div className="flex justify-between text-white">
                              <span>{t("tracker.tag", "태그")}: {b.ocrResult.tagNumber}</span>
                              <span>{b.ocrResult.airline}</span>
                            </div>
                            <div className="flex justify-between text-white/70">
                              <span>{t("tracker.destination", "목적지")}: {b.ocrResult.destination}</span>
                              <span>{t("tracker.confidence", "신뢰도")}: {b.ocrResult.confidence}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                        <QrCode className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground mb-2">{t("tracker.uploadTagDesc", "수화물 태그 사진을 업로드하면 번호를 자동 인식합니다")}</p>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          id={`tag-upload-${b.id}`}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleTagPhotoUpload(b.id, file);
                          }}
                        />
                        <label htmlFor={`tag-upload-${b.id}`}>
                          <Button type="button" variant="outline" size="sm" asChild disabled={uploadTagPhoto.isPending}>
                            <span>
                              <Upload className="h-3.5 w-3.5 mr-1" />
                              {uploadTagPhoto.isPending ? t("tracker.recognizing", "인식 중...") : t("tracker.uploadTag", "태그 사진 촬영/업로드")}
                            </span>
                          </Button>
                        </label>
                      </div>
                    )}

                    {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                    {b.notes && <p className="text-xs text-muted-foreground bg-secondary/50 rounded p-2">{b.notes}</p>}
                    {b.statusUpdatedAt && (
                      <p className="text-[10px] text-muted-foreground">
                        {t("tracker.lastUpdate", "마지막 업데이트")}: {new Date(b.statusUpdatedAt).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Checkin Tab */}
          <TabsContent value="checkin" className="space-y-4">
            {(!checkins || checkins.length === 0) ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <DoorOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{t("tracker.noCheckin", "체크인 정보가 없습니다.")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("tracker.noCheckinDesc", "관리자가 체크인 정보를 등록하면 여기에 표시됩니다.")}</p>
                </CardContent>
              </Card>
            ) : checkins.map((c: any) => {
              const status = checkinStatusLabels[c.checkinStatus] || { label: c.checkinStatus, color: "bg-slate-500/20" };
              return (
                <Card key={c.id} className="bg-card border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg">{c.flightNo || t("tracker.tabFlights", "항공편")}</p>
                        <p className="text-xs text-muted-foreground">{c.airline || ""}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {c.checkinCounter && (
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-[10px] text-muted-foreground mb-1">{t("tracker.checkinCounter", "체크인 카운터")}</p>
                          <p className="font-semibold flex items-center gap-1">
                            <DoorOpen className="h-3.5 w-3.5 text-primary" />{c.checkinCounter}
                          </p>
                        </div>
                      )}
                      {c.gateNumber && (
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-[10px] text-muted-foreground mb-1">{t("tracker.gate", "탑승 게이트")}</p>
                          <p className="font-semibold flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-primary" />{c.gateNumber}
                          </p>
                        </div>
                      )}
                      {c.seatNumber && (
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-[10px] text-muted-foreground mb-1">{t("tracker.seat", "좌석 번호")}</p>
                          <p className="font-semibold flex items-center gap-1">
                            <Armchair className="h-3.5 w-3.5 text-primary" />{c.seatNumber}
                          </p>
                        </div>
                      )}
                      {c.boardingTime && (
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-[10px] text-muted-foreground mb-1">{t("tracker.boardingTime", "탑승 시간")}</p>
                          <p className="font-semibold flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            {new Date(c.boardingTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      )}
                    </div>

                    {c.boardingPassUrl && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t("tracker.boardingPass", "탑승권")}</p>
                        <img src={c.boardingPassUrl} alt="" className="w-full rounded-lg border border-border" />
                      </div>
                    )}

                    {c.notes && (
                      <p className="text-xs text-muted-foreground bg-secondary/50 rounded p-2">{c.notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
