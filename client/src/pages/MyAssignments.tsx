import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Car, Hotel, CheckCircle, ArrowLeft, FileText, MessageCircle, MapPin, Copy, ExternalLink } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function MyAssignments() {
  const { t } = useTranslation();
  const params = useParams<{ regId: string }>();
  const regId = parseInt(params.regId || "0");

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
              assignments.accommodations.map((a: any) => (
                <div key={a.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <span className="font-semibold">{a.hotelName}</span>
                  {a.roomNumber && <p className="text-sm">{t("assignments.room")}: {a.roomNumber} ({a.roomType})</p>}
                  {a.address && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-background/60 border border-border/50">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground break-words">{a.address}</p>
                        <div className="flex items-center gap-2 mt-1.5">
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
                        </div>
                      </div>
                    </div>
                  )}
                  {a.checkIn && <p className="text-xs text-muted-foreground">{t("assignments.checkIn")}: {new Date(a.checkIn).toLocaleString()}</p>}
                  {a.checkOut && <p className="text-xs text-muted-foreground">{t("assignments.checkOut")}: {new Date(a.checkOut).toLocaleString()}</p>}
                </div>
              ))
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
    </div>
  );
}
