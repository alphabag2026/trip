import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Car, BedDouble, Loader2, MapPin, Calendar, Copy, ExternalLink, Users, Hotel, Home, Building2, TreePine,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const ACCOM_TYPE_LABELS: Record<string, string> = {
  hotel: "호텔", villa: "별장", apartment: "아파트", resort: "리조트", pension: "펜션", other: "기타",
};
const ROOM_TYPE_LABELS: Record<string, string> = {
  single: "싱글", double: "더블", twin: "트윈", suite: "스위트", family: "패밀리", dormitory: "도미토리",
};
const ACCOM_TYPE_ICONS: Record<string, any> = {
  hotel: Hotel, villa: Home, apartment: Building2, resort: TreePine, pension: Home, other: Hotel,
};

export default function TransportTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const myPickupsQuery = trpc.myTravel.myPickups.useQuery(undefined, { enabled: !!user });
  const myAccomQuery = trpc.myTravel.myAccommodations.useQuery(undefined, { enabled: !!user });
  const roommatesQuery = trpc.myTravel.myRoommates.useQuery(undefined, { enabled: !!user });

  // Map of registration ID -> name for roommates
  const regMap: Record<number, string> = (roommatesQuery.data ?? {}) as Record<number, string>;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("myPage.copied", "복사되었습니다"));
  };

  const openGoogleMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* 차량 배정 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Car className="w-5 h-5" />{t("myPage.myPickups", "배정된 차량 정보")}</CardTitle>
        </CardHeader>
        <CardContent>
          {myPickupsQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (myPickupsQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-center py-6">{t("myPage.noPickups", "배정된 차량이 없습니다")}</p>
          ) : (
            <div className="space-y-4">
              {(myPickupsQuery.data ?? []).map((p: any) => (
                <Card key={p.id} className="border-primary/20">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start gap-4">
                      {p.vehiclePhotoUrl && (
                        <img loading="lazy" decoding="async" src={p.vehiclePhotoUrl} alt="vehicle" className="w-24 h-24 rounded-lg object-cover border" />
                      )}
                      <div className="flex-1 space-y-1">
                        <h4 className="font-semibold text-lg">{p.vehicleName}</h4>
                        {p.vehiclePlateNumber && (
                          <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-md">
                            <span className="font-mono font-bold text-lg">{p.vehiclePlateNumber}</span>
                          </div>
                        )}
                        {p.vehicleColor && <p className="text-sm text-muted-foreground">{t("myPage.vehicleColor", "색상")}: {p.vehicleColor}</p>}
                        {p.vehicleType && <p className="text-sm text-muted-foreground">{t("myPage.vehicleType", "차종")}: {p.vehicleType}</p>}
                        <p className="text-sm">{t("myPage.capacity", "정원")}: {p.vehicleCapacity}{t("myPage.persons", "명")}</p>
                      </div>
                    </div>
                    {(p.driverName || p.driverPhone) && (
                      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{t("myPage.driver", "기사")}: {p.driverName || "-"}</p>
                          {p.driverPhone && (
                            <a href={`tel:${p.driverPhone}`} className="text-sm text-primary hover:underline">{p.driverPhone}</a>
                          )}
                        </div>
                      </div>
                    )}
                    {p.pickupLocation && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{p.pickupLocation}</span>
                      </div>
                    )}
                    {p.pickupTime && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{new Date(p.pickupTime).toLocaleString("ko-KR")}</span>
                      </div>
                    )}
                    <Badge variant={p.status === "completed" ? "default" : "secondary"}>
                      {p.status === "pending" ? t("myPage.pickupPending", "대기") : p.status === "en_route" ? t("myPage.pickupEnRoute", "이동중") : p.status === "picked_up" ? t("myPage.pickupDone", "픽업완료") : p.status === "completed" ? t("myPage.pickupCompleted", "완료") : p.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 숙소 배정 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BedDouble className="w-5 h-5" />{t("myPage.myAccom", "배정된 숙소 정보")}</CardTitle>
        </CardHeader>
        <CardContent>
          {myAccomQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (myAccomQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-center py-6">{t("myPage.noAccom", "배정된 숙소가 없습니다")}</p>
          ) : (
            <div className="space-y-4">
              {(myAccomQuery.data ?? []).map((a: any) => {
                const AccomIcon = ACCOM_TYPE_ICONS[a.accommodationType] || Hotel;
                const roommates: number[] = Array.isArray(a.assignedRegistrationIds) ? a.assignedRegistrationIds : [];

                return (
                  <Card key={a.id} className="border-primary/20 overflow-hidden">
                    {/* Header with accommodation type badge */}
                    <div className="bg-primary/5 px-4 py-2 flex items-center justify-between border-b">
                      <div className="flex items-center gap-2">
                        <AccomIcon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          {ACCOM_TYPE_LABELS[a.accommodationType] || t("myPage.hotel", "호텔")}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {ROOM_TYPE_LABELS[a.roomType] || a.roomType}
                      </Badge>
                    </div>

                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start gap-4">
                        {a.accommodationPhotoUrl && (
                          <img loading="lazy" decoding="async" src={a.accommodationPhotoUrl} alt="hotel" className="w-24 h-24 rounded-lg object-cover border" />
                        )}
                        <div className="flex-1 space-y-1">
                          <h4 className="font-semibold text-lg">{a.hotelName}</h4>
                          {a.roomNumber && (
                            <p className="text-sm">
                              {t("myPage.roomNum", "방 번호")}: <span className="font-bold text-primary text-lg">{a.roomNumber}</span>
                            </p>
                          )}
                          {a.floorNumber && <p className="text-sm text-muted-foreground">{a.floorNumber}{t("myPage.floor", "층")}</p>}
                        </div>
                      </div>

                      {/* Check-in / Check-out */}
                      {(a.checkIn || a.checkOut) && (
                        <div className="flex gap-6 p-3 bg-muted/50 rounded-lg">
                          {a.checkIn && (
                            <div>
                              <p className="text-xs text-muted-foreground">{t("myPage.checkIn", "체크인")}</p>
                              <p className="text-sm font-medium">{new Date(a.checkIn).toLocaleString("ko-KR")}</p>
                            </div>
                          )}
                          {a.checkOut && (
                            <div>
                              <p className="text-xs text-muted-foreground">{t("myPage.checkOut", "체크아웃")}</p>
                              <p className="text-sm font-medium">{new Date(a.checkOut).toLocaleString("ko-KR")}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Roommates */}
                      {roommates.length > 1 && (
                        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                              {t("myPage.roommates", "같은 방 동료")} ({roommates.length}{t("myPage.persons", "명")})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {roommates.map((id: number) => (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {regMap[id] || `#${id}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {a.notes && <p className="text-sm text-muted-foreground italic">{a.notes}</p>}

                      {/* Action buttons: Copy address, Open in Google Maps */}
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => copyToClipboard(a.hotelName + (a.roomNumber ? ` ${a.roomNumber}호` : ""))}
                        >
                          <Copy className="w-3 h-3" />
                          {t("myPage.copyAddress", "주소 복사")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => openGoogleMaps(a.hotelName)}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {t("myPage.openMap", "지도 열기")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
