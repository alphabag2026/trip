import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Car, Hotel, CheckCircle, ArrowLeft, FileText, MessageCircle } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function MyAssignments() {
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
      toast.success(`${vars.type === "flight" ? "항공편" : vars.type === "accommodation" ? "숙소" : "픽업"} 배치를 확정했습니다`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const vouchers = useMemo(() => voucherList ?? [], [voucherList]);

  if (!assignments) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
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
          <h1 className="font-bold">내 배치 정보</h1>
        </div>
      </header>

      <div className="container py-6 space-y-6 max-w-2xl">
        {/* Flight Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plane className="h-5 w-5 text-primary" /> 항공편 배치
              {reg?.flightConfirmed && <Badge className="bg-green-500/20 text-green-400 ml-auto">확정됨</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.flights.length === 0 ? (
              <p className="text-sm text-muted-foreground">배치된 항공편이 없습니다</p>
            ) : (
              assignments.flights.map((f) => (
                <div key={f.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{f.flightNo}</span>
                    <Badge variant={f.flightStatus === "delayed" ? "destructive" : "secondary"}>{f.flightStatus}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.airline}</p>
                  <p className="text-sm">{f.departureAirport} → {f.arrivalAirport}</p>
                  {f.scheduledDeparture && <p className="text-xs text-muted-foreground">출발: {new Date(f.scheduledDeparture).toLocaleString("ko-KR")}</p>}
                  {f.scheduledArrival && <p className="text-xs text-muted-foreground">도착: {new Date(f.scheduledArrival).toLocaleString("ko-KR")}</p>}
                  {(f.delayMinutes ?? 0) > 0 && <p className="text-xs text-red-400">지연: {f.delayMinutes}분</p>}
                </div>
              ))
            )}
            {assignments.flights.length > 0 && !reg?.flightConfirmed && (
              <Button className="w-full" onClick={() => confirmMutation.mutate({ registrationId: regId, type: "flight" })} disabled={confirmMutation.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" /> 항공편 배치 확정
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pickup Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="h-5 w-5 text-primary" /> 차량 배치
              {reg?.pickupConfirmed && <Badge className="bg-green-500/20 text-green-400 ml-auto">확정됨</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.pickups.length === 0 ? (
              <p className="text-sm text-muted-foreground">배치된 차량이 없습니다</p>
            ) : (
              assignments.pickups.map((p) => (
                <div key={p.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.vehicleName}</span>
                    <Badge variant="secondary">{p.status}</Badge>
                  </div>
                  {p.driverName && <p className="text-sm">기사: {p.driverName} {p.driverPhone && `(${p.driverPhone})`}</p>}
                  {p.pickupLocation && <p className="text-sm text-muted-foreground">장소: {p.pickupLocation}</p>}
                  {p.pickupTime && <p className="text-xs text-muted-foreground">시간: {new Date(p.pickupTime).toLocaleString("ko-KR")}</p>}
                </div>
              ))
            )}
            {assignments.pickups.length > 0 && !reg?.pickupConfirmed && (
              <Button className="w-full" onClick={() => confirmMutation.mutate({ registrationId: regId, type: "pickup" })} disabled={confirmMutation.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" /> 차량 배치 확정
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Accommodation Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Hotel className="h-5 w-5 text-primary" /> 숙소 배치
              {reg?.accommodationConfirmed && <Badge className="bg-green-500/20 text-green-400 ml-auto">확정됨</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.accommodations.length === 0 ? (
              <p className="text-sm text-muted-foreground">배치된 숙소가 없습니다</p>
            ) : (
              assignments.accommodations.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <span className="font-semibold">{a.hotelName}</span>
                  {a.roomNumber && <p className="text-sm">객실: {a.roomNumber} ({a.roomType})</p>}
                  {a.checkIn && <p className="text-xs text-muted-foreground">체크인: {new Date(a.checkIn).toLocaleString("ko-KR")}</p>}
                  {a.checkOut && <p className="text-xs text-muted-foreground">체크아웃: {new Date(a.checkOut).toLocaleString("ko-KR")}</p>}
                </div>
              ))
            )}
            {assignments.accommodations.length > 0 && !reg?.accommodationConfirmed && (
              <Button className="w-full" onClick={() => confirmMutation.mutate({ registrationId: regId, type: "accommodation" })} disabled={confirmMutation.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" /> 숙소 배치 확정
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Vouchers */}
        {vouchers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" /> 바우처
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
                    <Button variant="outline" size="sm">다운로드</Button>
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
