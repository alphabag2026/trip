import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car, BedDouble, Loader2, MapPin, Calendar,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function TransportTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const myPickupsQuery = trpc.myTravel.myPickups.useQuery(undefined, { enabled: !!user });
  const myAccomQuery = trpc.myTravel.myAccommodations.useQuery(undefined, { enabled: !!user });

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
              {(myAccomQuery.data ?? []).map((a: any) => (
                <Card key={a.id} className="border-primary/20">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start gap-4">
                      {a.accommodationPhotoUrl && (
                        <img loading="lazy" decoding="async" src={a.accommodationPhotoUrl} alt="hotel" className="w-24 h-24 rounded-lg object-cover border" />
                      )}
                      <div className="flex-1 space-y-1">
                        <h4 className="font-semibold text-lg">{a.hotelName}</h4>
                        {a.roomNumber && <p className="text-sm">{t("myPage.roomNum", "방 번호")}: <span className="font-bold">{a.roomNumber}</span></p>}
                        <p className="text-sm text-muted-foreground">{t("myPage.roomType", "객실 유형")}: {a.roomType === "single" ? t("myPage.single", "싱글") : a.roomType === "double" ? t("myPage.double", "더블") : a.roomType === "twin" ? t("myPage.twin", "트윈") : t("myPage.suite", "스위트")}</p>
                        {a.floorNumber && <p className="text-sm text-muted-foreground">{a.floorNumber}{t("myPage.floor", "층")}</p>}
                      </div>
                    </div>
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
                    {a.notes && <p className="text-sm text-muted-foreground">{a.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
