import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plane, Car, Clock, MapPin, Phone, User, AlertTriangle, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import LanguageSelector from "@/components/LanguageSelector";

export default function FlightPickupInfo() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [regId, setRegId] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);

  const flightStatusMap: Record<string, { label: string; color: string }> = {
    scheduled: { label: t("lookup.fs_scheduled"), color: "bg-gray-500" },
    boarding: { label: t("lookup.fs_scheduled"), color: "bg-blue-500" },
    departed: { label: t("lookup.fs_departed"), color: "bg-green-500" },
    in_air: { label: t("lookup.fs_inair"), color: "bg-sky-500" },
    landed: { label: t("lookup.fs_landed"), color: "bg-emerald-500" },
    delayed: { label: t("lookup.fs_delayed"), color: "bg-yellow-500" },
    cancelled: { label: t("lookup.fs_cancelled"), color: "bg-red-500" },
  };

  const pickupStatusMap: Record<string, { label: string; color: string }> = {
    pending: { label: t("common.loading"), color: "bg-gray-500" },
    en_route: { label: t("flightPickup.enRoute", "이동중"), color: "bg-blue-500" },
    waiting: { label: t("flightPickup.waiting", "대기중"), color: "bg-yellow-500" },
    picked_up: { label: t("flightPickup.pickedUp", "픽업완료"), color: "bg-green-500" },
    completed: { label: t("flightPickup.completed", "완료"), color: "bg-emerald-500" },
  };

  const lookupQuery = trpc.registration.lookup.useQuery(
    { name, phone },
    { enabled: searched && !!name && !!phone }
  );

  const flightsQuery = trpc.flight.getMyFlights.useQuery(
    { registrationId: regId! },
    { enabled: !!regId, refetchInterval: 5000 }
  );

  const pickupsQuery = trpc.pickup.getMyPickup.useQuery(
    { registrationId: regId! },
    { enabled: !!regId, refetchInterval: 5000 }
  );

  const handleSearch = () => {
    if (!name || !phone) return;
    setSearched(true);
  };

  if (lookupQuery.data && !regId) {
    const reg = lookupQuery.data;
    if (reg && 'id' in reg) {
      setRegId((reg as any).id);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{t("flightPickup.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("flightPickup.desc", "항공편 지연 정보와 공항 픽업 안내를 실시간으로 확인하세요")}</p>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="container py-6 max-w-3xl mx-auto space-y-6">
        {!regId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> {t("lookup.verify")}</CardTitle>
              <CardDescription>{t("flightPickup.searchDesc", "신청 시 입력한 이름과 전화번호를 입력해주세요")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("lookup.name")}</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("lookup.namePh")} />
                </div>
                <div>
                  <Label>{t("lookup.phone")}</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("lookup.phonePh")} />
                </div>
              </div>
              <Button onClick={handleSearch} className="w-full">{t("flightPickup.search")}</Button>
              {searched && lookupQuery.isLoading && (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("lookup.searching")}</div>
              )}
              {searched && !lookupQuery.isLoading && !lookupQuery.data && (
                <p className="text-center text-red-500 py-2">{t("lookup.noResult")}</p>
              )}
            </CardContent>
          </Card>
        )}

        {regId && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-blue-500" /> {t("flightPickup.flightInfo")}
                  <Badge variant="outline" className="ml-auto text-xs">{t("flightPickup.autoRefresh", "5초마다 자동 갱신")}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {flightsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : !flightsQuery.data?.length ? (
                  <p className="text-center text-muted-foreground py-8">{t("flightPickup.noFlight")}</p>
                ) : (
                  <div className="space-y-4">
                    {flightsQuery.data.map((flight: any) => {
                      const status = flightStatusMap[flight.flightStatus] || { label: flight.flightStatus, color: "bg-gray-500" };
                      const isDelayed = flight.delayMinutes > 0;
                      return (
                        <div key={flight.id} className={`border rounded-lg p-4 ${isDelayed ? "border-yellow-500 bg-yellow-500/5" : "border-border"}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">{flight.flightNo}</span>
                              {flight.airline && <span className="text-muted-foreground">({flight.airline})</span>}
                            </div>
                            <Badge className={`${status.color} text-white`}>{status.label}</Badge>
                          </div>
                          {isDelayed && (
                            <div className="flex items-center gap-2 mb-3 p-2 bg-yellow-500/10 rounded text-yellow-600 dark:text-yellow-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="font-medium">{flight.delayMinutes}{t("lookup.minDelay")}</span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground mb-1">{t("lookup.departure")}</p>
                              <p className="font-medium">{flight.departureAirport || "-"}</p>
                              <p>{flight.scheduledDeparture ? new Date(flight.scheduledDeparture).toLocaleString() : "-"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">{t("lookup.return", "도착")}</p>
                              <p className="font-medium">{flight.arrivalAirport || "-"}</p>
                              <p>{flight.scheduledArrival ? new Date(flight.scheduledArrival).toLocaleString() : "-"}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Badge variant="outline">{flight.direction === "outbound" ? t("lookup.departure") : t("lookup.return")}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-green-500" /> {t("flightPickup.pickupInfo")}
                  <Badge variant="outline" className="ml-auto text-xs">{t("flightPickup.autoRefresh", "5초마다 자동 갱신")}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pickupsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : !pickupsQuery.data?.length ? (
                  <p className="text-center text-muted-foreground py-8">{t("flightPickup.noPickup")}</p>
                ) : (
                  <div className="space-y-4">
                    {pickupsQuery.data.map((pickup: any) => {
                      const status = pickupStatusMap[pickup.status] || { label: pickup.status, color: "bg-gray-500" };
                      return (
                        <div key={pickup.id} className="border border-border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-lg">{pickup.vehicleName}</span>
                            <Badge className={`${status.color} text-white`}>{status.label}</Badge>
                          </div>
                          <Separator className="mb-3" />
                          <div className="space-y-2 text-sm">
                            {pickup.driverName && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{t("flightPickup.driver", "기사")}: <strong>{pickup.driverName}</strong></span>
                              </div>
                            )}
                            {pickup.driverPhone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <a href={`tel:${pickup.driverPhone}`} className="text-blue-500 underline">{pickup.driverPhone}</a>
                              </div>
                            )}
                            {pickup.pickupLocation && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{pickup.pickupLocation}</span>
                              </div>
                            )}
                            {pickup.pickupTime && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{t("flightPickup.pickupTime", "픽업 시간")}: {new Date(pickup.pickupTime).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                          {pickup.pickupPhotoUrl && (
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground mb-1">{t("flightPickup.pickupPhoto", "픽업 장소 사진")}</p>
                              <img loading="lazy" decoding="async" src={pickup.pickupPhotoUrl} alt="" className="rounded-lg max-h-48 object-cover w-full" />
                            </div>
                          )}
                          {pickup.notes && (
                            <p className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">{pickup.notes}</p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <Link href={`/pickup/${pickup.meetupId || 0}`}>
                              <Button variant="outline" size="sm">{t("lookup.pickupBoard")}</Button>
                            </Link>
                            {pickup.driverPhone && (
                              <a href={`tel:${pickup.driverPhone}`}>
                                <Button variant="default" size="sm">
                                  <Phone className="h-3 w-3 mr-1" /> {t("flightPickup.callDriver", "기사 전화")}
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap gap-2">
                  <Link href="/lookup">
                    <Button variant="outline" size="sm">{t("nav.lookup")}</Button>
                  </Link>
                  <Link href={`/my-assignments/${regId}`}>
                    <Button variant="outline" size="sm">{t("flightPickup.assignments", "배치 확인")}</Button>
                  </Link>
                  <Link href="/schedule">
                    <Button variant="outline" size="sm">{t("lookup.viewSchedule")}</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
