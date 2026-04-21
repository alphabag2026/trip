import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Shield, Plane, Hotel, Calendar, DollarSign, Save, AlertTriangle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function TravelPolicy() {
  const { user } = useAuth();
  const meetupsQ = trpc.meetup.list.useQuery();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);

  const policyQ = trpc.travelPolicy.get.useQuery(
    { meetupId: selectedMeetupId! },
    { enabled: !!selectedMeetupId }
  );

  const upsertMutation = trpc.travelPolicy.upsert.useMutation({
    onSuccess: () => {
      toast.success("여행 정책이 저장되었습니다");
      policyQ.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Form state
  const [form, setForm] = useState({
    allowedFlightClass: "economy" as string,
    maxFlightBudget: "",
    flightBudgetCurrency: "USD",
    allowedHotelStars: 3,
    maxHotelBudgetPerNight: "",
    hotelBudgetCurrency: "USD",
    maxTravelDays: "",
    minAdvanceBookingDays: "7",
    totalBudget: "",
    totalBudgetCurrency: "USD",
    requireApproval: false,
    autoRejectOverBudget: false,
    policyNotes: "",
  });

  useEffect(() => {
    if (policyQ.data) {
      const p = policyQ.data;
      setForm({
        allowedFlightClass: p.allowedFlightClass || "economy",
        maxFlightBudget: p.maxFlightBudget ? String(p.maxFlightBudget) : "",
        flightBudgetCurrency: p.flightBudgetCurrency || "USD",
        allowedHotelStars: p.allowedHotelStars ?? 3,
        maxHotelBudgetPerNight: p.maxHotelBudgetPerNight ? String(p.maxHotelBudgetPerNight) : "",
        hotelBudgetCurrency: p.hotelBudgetCurrency || "USD",
        maxTravelDays: p.maxTravelDays ? String(p.maxTravelDays) : "",
        minAdvanceBookingDays: p.minAdvanceBookingDays ? String(p.minAdvanceBookingDays) : "7",
        totalBudget: p.totalBudget ? String(p.totalBudget) : "",
        totalBudgetCurrency: p.totalBudgetCurrency || "USD",
        requireApproval: p.requireApproval ?? false,
        autoRejectOverBudget: p.autoRejectOverBudget ?? false,
        policyNotes: p.policyNotes || "",
      });
    } else if (policyQ.isFetched && !policyQ.data) {
      setForm({
        allowedFlightClass: "economy",
        maxFlightBudget: "",
        flightBudgetCurrency: "USD",
        allowedHotelStars: 3,
        maxHotelBudgetPerNight: "",
        hotelBudgetCurrency: "USD",
        maxTravelDays: "",
        minAdvanceBookingDays: "7",
        totalBudget: "",
        totalBudgetCurrency: "USD",
        requireApproval: false,
        autoRejectOverBudget: false,
        policyNotes: "",
      });
    }
  }, [policyQ.data, policyQ.isFetched]);

  // Auto-select first meetup
  useEffect(() => {
    if (meetupsQ.data?.length && !selectedMeetupId) {
      setSelectedMeetupId(meetupsQ.data[0].id);
    }
  }, [meetupsQ.data, selectedMeetupId]);

  const handleSave = () => {
    if (!selectedMeetupId) return;
    upsertMutation.mutate({
      meetupId: selectedMeetupId,
      allowedFlightClass: form.allowedFlightClass as any,
      maxFlightBudget: form.maxFlightBudget ? Number(form.maxFlightBudget) : undefined,
      flightBudgetCurrency: form.flightBudgetCurrency,
      allowedHotelStars: form.allowedHotelStars,
      maxHotelBudgetPerNight: form.maxHotelBudgetPerNight ? Number(form.maxHotelBudgetPerNight) : undefined,
      hotelBudgetCurrency: form.hotelBudgetCurrency,
      maxTravelDays: form.maxTravelDays ? Number(form.maxTravelDays) : undefined,
      minAdvanceBookingDays: form.minAdvanceBookingDays ? Number(form.minAdvanceBookingDays) : undefined,
      totalBudget: form.totalBudget ? Number(form.totalBudget) : undefined,
      totalBudgetCurrency: form.totalBudgetCurrency,
      requireApproval: form.requireApproval,
      autoRejectOverBudget: form.autoRejectOverBudget,
      policyNotes: form.policyNotes || undefined,
    });
  };

  const spentAmount = policyQ.data ? Number(policyQ.data.spentAmount || 0) : 0;
  const totalBudget = form.totalBudget ? Number(form.totalBudget) : 0;
  const utilization = totalBudget > 0 ? Math.round((spentAmount / totalBudget) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Travel Policy
          </h1>
          <p className="text-muted-foreground mt-1">이벤트별 여행 정책 및 예산 관리</p>
        </div>
        <Button onClick={handleSave} disabled={!selectedMeetupId || upsertMutation.isPending}>
          {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          저장
        </Button>
      </div>

      {/* Meetup Selector */}
      <Card>
        <CardContent className="pt-6">
          <Label>이벤트 선택</Label>
          <Select
            value={selectedMeetupId ? String(selectedMeetupId) : ""}
            onValueChange={(v) => setSelectedMeetupId(Number(v))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="이벤트를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {meetupsQ.data?.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedMeetupId && (
        <>
          {/* Budget Overview */}
          {totalBudget > 0 && (
            <Card className={utilization > 90 ? "border-red-300 bg-red-50/50" : utilization > 70 ? "border-yellow-300 bg-yellow-50/50" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  예산 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">지출: ${spentAmount.toLocaleString()}</span>
                  <span className="text-sm font-medium">{utilization}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${utilization > 90 ? "bg-red-500" : utilization > 70 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">$0</span>
                  <span className="text-xs text-muted-foreground">${totalBudget.toLocaleString()} {form.totalBudgetCurrency}</span>
                </div>
                {utilization > 90 && (
                  <div className="flex items-center gap-2 mt-3 text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    예산의 90% 이상 사용됨 - 주의 필요
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Flight Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                항공 정책
              </CardTitle>
              <CardDescription>참석자 항공편 예약 기준</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>허용 좌석 클래스</Label>
                  <Select value={form.allowedFlightClass} onValueChange={(v) => setForm(f => ({ ...f, allowedFlightClass: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">Economy</SelectItem>
                      <SelectItem value="premium_economy">Premium Economy</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="first">First</SelectItem>
                      <SelectItem value="any">제한 없음</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>1인당 항공 예산 상한</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      placeholder="예: 2000"
                      value={form.maxFlightBudget}
                      onChange={(e) => setForm(f => ({ ...f, maxFlightBudget: e.target.value }))}
                    />
                    <Select value={form.flightBudgetCurrency} onValueChange={(v) => setForm(f => ({ ...f, flightBudgetCurrency: v }))}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="KRW">KRW</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USDT">USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hotel Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hotel className="h-5 w-5" />
                숙소 정책
              </CardTitle>
              <CardDescription>참석자 숙소 예약 기준</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>최소 호텔 등급</Label>
                  <Select value={String(form.allowedHotelStars)} onValueChange={(v) => setForm(f => ({ ...f, allowedHotelStars: Number(v) }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2성</SelectItem>
                      <SelectItem value="3">3성</SelectItem>
                      <SelectItem value="4">4성</SelectItem>
                      <SelectItem value="5">5성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>1박 숙소 예산 상한</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      placeholder="예: 200"
                      value={form.maxHotelBudgetPerNight}
                      onChange={(e) => setForm(f => ({ ...f, maxHotelBudgetPerNight: e.target.value }))}
                    />
                    <Select value={form.hotelBudgetCurrency} onValueChange={(v) => setForm(f => ({ ...f, hotelBudgetCurrency: v }))}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="KRW">KRW</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USDT">USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Travel Period & Budget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                기간 및 예산
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>최대 여행 일수</Label>
                  <Input
                    type="number"
                    placeholder="예: 5"
                    className="mt-1"
                    value={form.maxTravelDays}
                    onChange={(e) => setForm(f => ({ ...f, maxTravelDays: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>최소 사전 예약 기간 (일)</Label>
                  <Input
                    type="number"
                    placeholder="예: 7"
                    className="mt-1"
                    value={form.minAdvanceBookingDays}
                    onChange={(e) => setForm(f => ({ ...f, minAdvanceBookingDays: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>전체 예산</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      placeholder="예: 50000"
                      value={form.totalBudget}
                      onChange={(e) => setForm(f => ({ ...f, totalBudget: e.target.value }))}
                    />
                    <Select value={form.totalBudgetCurrency} onValueChange={(v) => setForm(f => ({ ...f, totalBudgetCurrency: v }))}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="KRW">KRW</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USDT">USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval Settings */}
          <Card>
            <CardHeader>
              <CardTitle>승인 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>예산 초과 시 승인 필요</Label>
                  <p className="text-xs text-muted-foreground">예산을 초과하는 예약은 관리자 승인이 필요합니다</p>
                </div>
                <Switch checked={form.requireApproval} onCheckedChange={(v) => setForm(f => ({ ...f, requireApproval: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>예산 초과 자동 거절</Label>
                  <p className="text-xs text-muted-foreground">예산을 초과하는 예약을 자동으로 거절합니다</p>
                </div>
                <Switch checked={form.autoRejectOverBudget} onCheckedChange={(v) => setForm(f => ({ ...f, autoRejectOverBudget: v }))} />
              </div>
              <div>
                <Label>정책 안내 메모</Label>
                <Textarea
                  className="mt-1"
                  placeholder="참석자에게 표시될 여행 정책 안내 메모..."
                  value={form.policyNotes}
                  onChange={(e) => setForm(f => ({ ...f, policyNotes: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
