import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Car, Hotel, CheckCircle, ArrowLeft, FileText, MessageCircle, MapPin, Copy, ExternalLink, Clock, ImageIcon, Navigation, Wifi, ParkingCircle, UtensilsCrossed, Waves, Dumbbell, WashingMachine, CookingPot, Snowflake, ChevronLeft, ChevronRight, X, Share2 } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function MyAssignments() {
  const { t } = useTranslation();
  const params = useParams<{ regId: string }>();
  const regId = parseInt(params.regId || "0");
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const { data: assignments, refetch } = trpc.assignment.getMyAssignments.useQuery(
    { registrationId: regId }, { enabled: regId > 0 }
  );
  const { data: voucherList } = trpc.voucher.getByRegistration.useQuery(
    { registrationId: regId }, { enabled: regId > 0 }
  );
  const { data: reg } = trpc.registration.getById.useQuery(
    { id: regId }, { enabled: regId > 0 }
  );
  const confirmMutation = trpc.assignment.confirm.useMutation({
    onSuccess: (_, vars) => {
      const typeLabel = vars.type === "flight" ? t("assignments.flight") : vars.type === "accommodation" ? t("assignments.accommodation") : t("assignments.pickup");
      toast.success(t("assignments.confirmed", { type: typeLabel }));
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const vouchers = useMemo(() => voucherList ?? [], [voucherList]);

  if (!assignments) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center gap-3 h-14">
          <Link href="/lookup">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="font-bold">{t("assignments.title")}</h1>
        </div>
      </header>

      <div className="container py-6 space-y-6 max-w-2xl">
        {/* Flight Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plane className="h-5 w-5 text-primary" /> {t("assignments.flightAssignment")}
              {reg?.flightConfirmed && <Badge className="bg-green-500/20 text-green-400 ml-auto">{t("assignments.confirmedBadge")}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.flights.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("assignments.noFlights")}</p>
            ) : (
              assignments.flights.map((f) => (
                <div key={f.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{f.flightNo}</span>
                    <Badge variant={f.flightStatus === "delayed" ? "destructive" : "secondary"}>{f.flightStatus}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.airline}</p>
                  <p className="text-sm">{f.departureAirport} → {f.arrivalAirport}</p>
                  {f.scheduledDeparture && <p className="text-xs text-muted-foreground">{t("assignments.departure")}: {new Date(f.scheduledDeparture).toLocaleString()}</p>}
                  {f.scheduledArrival && <p className="text-xs text-muted-foreground">{t("assignments.arrival")}: {new Date(f.scheduledArrival).toLocaleString()}</p>}
                  {(f.delayMinutes ?? 0) > 0 && <p className="text-xs text-red-400">{t("assignments.delay")}: {f.delayMinutes}{t("assignments.minutes")}</p>}
                </div>
              ))
            )}
            {assignments.flights.length > 0 && !reg?.flightConfirmed && (
              <Button className="w-full" onClick={() => confirmMutation.mutate({ registrationId: regId, type: "flight" })} disabled={confirmMutation.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" /> {t("assignments.confirmFlight")}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pickup Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="h-5 w-5 text-primary" /> {t("assignments.pickupAssignment")}
              {reg?.pickupConfirmed && <Badge className="bg-green-500/20 text-green-400 ml-auto">{t("assignments.confirmedBadge")}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.pickups.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("assignments.noPickups")}</p>
            ) : (
              assignments.pickups.map((p) => (
                <div key={p.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.vehicleName}</span>
                    <Badge variant="secondary">{p.status}</Badge>
                  </div>
                  {p.driverName && <p className="text-sm">{t("assignments.driver")}: {p.driverName} {p.driverPhone && `(${p.driverPhone})`}</p>}
                  {p.pickupLocation && <p className="text-sm text-muted-foreground">{t("assignments.location")}: {p.pickupLocation}</p>}
                  {p.pickupTime && <p className="text-xs text-muted-foreground">{t("assignments.time")}: {new Date(p.pickupTime).toLocaleString()}</p>}
                </div>
              ))
            )}
            {assignments.pickups.length > 0 && !reg?.pickupConfirmed && (
              <Button className="w-full" onClick={() => confirmMutation.mutate({ registrationId: regId, type: "pickup" })} disabled={confirmMutation.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" /> {t("assignments.confirmPickup")}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Accommodation Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Hotel className="h-5 w-5 text-primary" /> {t("assignments.accommodationAssignment")}
              {reg?.accommodationConfirmed && <Badge className="bg-green-500/20 text-green-400 ml-auto">{t("assignments.confirmedBadge")}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.accommodations.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("assignments.noAccommodations")}</p>
            ) : (
              assignments.accommodations.map((a: any) => {
                const photos: string[] = Array.isArray(a.accommodationPhotos) ? a.accommodationPhotos : [];
                const amenities = a.amenities || null;
                const shareText = `🏨 숙소 배정 정보\n숙소: ${a.hotelName}${a.roomNumber ? ` (${a.roomNumber})` : ""}${a.address ? `\n주소: ${a.address}` : ""}${a.checkIn ? `\n체크인: ${new Date(a.checkIn).toLocaleString()}` : ""}${a.checkOut ? `\n체크아웃: ${new Date(a.checkOut).toLocaleString()}` : ""}${amenities?.wifi ? `\nWi-Fi: ${amenities.wifi.ssid} / PW: ${amenities.wifi.password}` : ""}${a.address ? `\n지도: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address)}` : ""}`;
                return (
                <div key={a.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  {/* 숙소 사진 갤러리 */}
                  {photos.length > 0 ? (
                    <div className="relative rounded-lg overflow-hidden h-44 bg-muted -mx-1 -mt-1 mb-2 cursor-pointer" onClick={() => { setGalleryPhotos(photos); setGalleryIndex(0); }}>
                      <img src={photos[0]} alt={a.hotelName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-2 left-3 text-white">
                        <p className="font-bold text-sm drop-shadow">{a.hotelName}</p>
                        {a.roomNumber && <p className="text-xs drop-shadow opacity-90">{a.roomNumber} ({a.roomType})</p>}
                      </div>
                      {photos.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {photos.length}장
                        </div>
                      )}
                    </div>
                  ) : a.accommodationPhotoUrl ? (
                    <div className="relative rounded-lg overflow-hidden h-44 bg-muted -mx-1 -mt-1 mb-2">
                      <img src={a.accommodationPhotoUrl} alt={a.hotelName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-2 left-3 text-white">
                        <p className="font-bold text-sm drop-shadow">{a.hotelName}</p>
                        {a.roomNumber && <p className="text-xs drop-shadow opacity-90">{a.roomNumber} ({a.roomType})</p>}
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold">{a.hotelName}</span>
                      {a.roomNumber && <p className="text-sm">{t("assignments.room")}: {a.roomNumber} ({a.roomType})</p>}
                    </>
                  )}

                  {/* 편의시설 아이콘 */}
                  {amenities && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {amenities.wifi && (
                        <button onClick={() => { navigator.clipboard.writeText(`Wi-Fi ID: ${amenities.wifi.ssid}\n비밀번호: ${amenities.wifi.password}`); toast.success("Wi-Fi 정보 복사 완료"); }} className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full hover:bg-blue-500/20 transition-colors">
                          <Wifi className="h-3 w-3" />
                          <span>Wi-Fi</span>
                          <Copy className="h-2.5 w-2.5 ml-0.5" />
                        </button>
                      )}
                      {amenities.parking && <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full"><ParkingCircle className="h-3 w-3" />주차</span>}
                      {amenities.breakfast && <span className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-500 px-2 py-1 rounded-full"><UtensilsCrossed className="h-3 w-3" />조식</span>}
                      {amenities.pool && <span className="flex items-center gap-1 text-xs bg-cyan-500/10 text-cyan-500 px-2 py-1 rounded-full"><Waves className="h-3 w-3" />수영장</span>}
                      {amenities.gym && <span className="flex items-center gap-1 text-xs bg-purple-500/10 text-purple-500 px-2 py-1 rounded-full"><Dumbbell className="h-3 w-3" />헬스장</span>}
                      {amenities.laundry && <span className="flex items-center gap-1 text-xs bg-pink-500/10 text-pink-500 px-2 py-1 rounded-full"><WashingMachine className="h-3 w-3" />세탁</span>}
                      {amenities.kitchen && <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full"><CookingPot className="h-3 w-3" />주방</span>}
                      {amenities.aircon && <span className="flex items-center gap-1 text-xs bg-sky-500/10 text-sky-500 px-2 py-1 rounded-full"><Snowflake className="h-3 w-3" />에어컨</span>}
                      {amenities.custom?.map((c: any, i: number) => (
                        <span key={i} className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">{c.name}: {c.value}</span>
                      ))}
                    </div>
                  )}

                  {/* Wi-Fi 상세 정보 */}
                  {amenities?.wifi && (
                    <div className="p-2 rounded-md bg-blue-500/5 border border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4 text-blue-500" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">ID:</span> <strong>{amenities.wifi.ssid}</strong>
                          <span className="text-muted-foreground ml-3">PW:</span> <strong>{amenities.wifi.password}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 체크인/아웃 시간 */}
                  {(a.checkIn || a.checkOut) && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/20">
                      <Clock className="h-4 w-4 text-green-500 shrink-0" />
                      <div className="text-sm">
                        {a.checkIn && <span className="text-foreground">{t("assignments.checkIn", "체크인")}: <strong>{new Date(a.checkIn).toLocaleString()}</strong></span>}
                        {a.checkIn && a.checkOut && <span className="text-muted-foreground mx-1.5">|</span>}
                        {a.checkOut && <span className="text-foreground">{t("assignments.checkOut", "체크아웃")}: <strong>{new Date(a.checkOut).toLocaleString()}</strong></span>}
                      </div>
                    </div>
                  )}

                  {/* 주소 및 이동 경로 */}
                  {a.address && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-background/60 border border-border/50">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground break-words">{a.address}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <button
                            onClick={() => { navigator.clipboard.writeText(a.address); toast.success(t("assignments.addressCopied", "주소가 복사되었습니다")); }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                            {t("assignments.copyAddress", "복사")}
                          </button>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t("assignments.openMap", "지도 보기")}
                          </a>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-green-500 hover:text-green-400 transition-colors"
                          >
                            <Navigation className="h-3 w-3" />
                            {t("assignments.getDirections", "경로 안내")}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 카카오톡/메시지 공유 버튼 */}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs bg-[#FEE500] text-[#3C1E1E] px-3 py-1.5 rounded-full font-medium hover:bg-[#FDD800] transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      카카오톡 공유
                    </a>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({ title: `숙소 배정 - ${a.hotelName}`, text: shareText, url: window.location.href });
                        } else {
                          navigator.clipboard.writeText(shareText);
                          toast.success("숙소 정보가 복사되었습니다");
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      공유하기
                    </button>
                  </div>
                </div>
              );})
            )}
            {assignments.accommodations.length > 0 && !reg?.accommodationConfirmed && (
              <Button className="w-full" onClick={() => confirmMutation.mutate({ registrationId: regId, type: "accommodation" })} disabled={confirmMutation.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" /> {t("assignments.confirmAccommodation")}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Vouchers */}
        {vouchers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" /> {t("assignments.vouchers")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vouchers.map((v) => (
                <div key={v.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{v.title}</p>
                    <Badge variant="secondary" className="text-xs">{v.voucherType}</Badge>
                  </div>
                  <a href={v.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">{t("assignments.download")}</Button>
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 사진 갤러리 슬라이드 모달 */}
      {galleryPhotos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setGalleryPhotos([])}>
          <div className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img src={galleryPhotos[galleryIndex]} alt={`사진 ${galleryIndex + 1}`} className="max-h-[70vh] w-auto object-contain rounded-lg" />
            <div className="flex items-center gap-4 mt-4">
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 bg-white/10 text-white hover:bg-white/20 rounded-full" onClick={() => setGalleryIndex(i => (i - 1 + galleryPhotos.length) % galleryPhotos.length)} disabled={galleryPhotos.length <= 1}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-white text-sm">{galleryIndex + 1} / {galleryPhotos.length}</span>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 bg-white/10 text-white hover:bg-white/20 rounded-full" onClick={() => setGalleryIndex(i => (i + 1) % galleryPhotos.length)} disabled={galleryPhotos.length <= 1}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            {/* 썸네일 도트 */}
            <div className="flex items-center gap-1.5 mt-3">
              {galleryPhotos.map((_, idx) => (
                <button key={idx} onClick={() => setGalleryIndex(idx)} className={`w-2 h-2 rounded-full transition-colors ${idx === galleryIndex ? "bg-white" : "bg-white/30"}`} />
              ))}
            </div>
            <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/50 text-white hover:bg-black/70 rounded-full" onClick={() => setGalleryPhotos([])}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
