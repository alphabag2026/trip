import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Luggage, DoorOpen, Plus, RefreshCw, Trash2, Edit2, Eye, Plane
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const baggageStatusLabels: Record<string, { label: string; color: string }> = {
  checked_in: { label: "체크인", color: "bg-blue-500/20 text-blue-400" },
  loaded: { label: "탑재", color: "bg-cyan-500/20 text-cyan-400" },
  in_transit: { label: "운송중", color: "bg-yellow-500/20 text-yellow-400" },
  arrived: { label: "도착", color: "bg-green-500/20 text-green-400" },
  claimed: { label: "수령", color: "bg-emerald-500/20 text-emerald-400" },
  delayed: { label: "지연", color: "bg-orange-500/20 text-orange-400" },
  lost: { label: "분실", color: "bg-red-500/20 text-red-400" },
};

const checkinStatusLabels: Record<string, { label: string; color: string }> = {
  not_checked_in: { label: "미체크인", color: "bg-slate-500/20 text-slate-400" },
  online_checkin: { label: "온라인", color: "bg-blue-500/20 text-blue-400" },
  counter_checkin: { label: "카운터", color: "bg-cyan-500/20 text-cyan-400" },
  boarding_pass_issued: { label: "탑승권", color: "bg-green-500/20 text-green-400" },
  boarded: { label: "탑승완료", color: "bg-emerald-500/20 text-emerald-400" },
};

export default function AdminBaggageCheckin() {
  const { t } = useTranslation();
  const [selectedMeetup, setSelectedMeetup] = useState<string>("all");
  const [showAddCheckin, setShowAddCheckin] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    registrationId: 0, meetupId: undefined as number | undefined,
    airline: "", flightNo: "", checkinCounter: "", gateNumber: "",
    seatNumber: "", boardingTime: "", notes: "",
  });

  const { data: meetups } = trpc.meetup.list.useQuery({});
  const { data: allBaggage, refetch: refetchBaggage } = trpc.baggage.list.useQuery();
  const { data: allCheckins, refetch: refetchCheckins } = trpc.checkin.list.useQuery();
  const { data: regs } = trpc.registration.list.useQuery({});

  const updateBaggageStatus = trpc.baggage.updateStatus.useMutation({
    onSuccess: () => { refetchBaggage(); toast.success(t("admin.baggageCheckin.t41", "수화물 상태가 업데이트되었습니다.")); },
  });
  const deleteBaggage = trpc.baggage.delete.useMutation({
    onSuccess: () => { refetchBaggage(); toast.success(t("admin.baggageCheckin.t42", "수화물이 삭제되었습니다.")); },
  });
  const createCheckin = trpc.checkin.create.useMutation({
    onSuccess: () => { refetchCheckins(); setShowAddCheckin(false); toast.success(t("admin.baggageCheckin.t43", "체크인 정보가 등록되었습니다.")); },
  });
  const updateCheckin = trpc.checkin.update.useMutation({
    onSuccess: () => { refetchCheckins(); toast.success(t("admin.baggageCheckin.t44", "체크인 정보가 업데이트되었습니다.")); },
  });
  const deleteCheckin = trpc.checkin.delete.useMutation({
    onSuccess: () => { refetchCheckins(); toast.success(t("admin.baggageCheckin.t45", "체크인 정보가 삭제되었습니다.")); },
  });

  const filteredBaggage = selectedMeetup === "all"
    ? allBaggage
    : allBaggage?.filter((b: any) => b.meetupId === Number(selectedMeetup));

  const filteredCheckins = selectedMeetup === "all"
    ? allCheckins
    : allCheckins?.filter((c: any) => c.meetupId === Number(selectedMeetup));

  const getRegName = (regId: number) => {
    const r = regs?.find((r: any) => r.id === regId);
    return r ? `${r.name} (${r.phone})` : `#${regId}`;
  };

  const handleAddCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkinForm.registrationId) { toast.error(t("admin.baggageCheckin.t46", "참석자를 선택해주세요.")); return; }
    createCheckin.mutate({
      ...checkinForm,
      registrationId: checkinForm.registrationId,
    });
  };

  // Stats
  const baggageStats = {
    total: allBaggage?.length || 0,
    claimed: allBaggage?.filter((b: any) => b.baggageStatus === "claimed").length || 0,
    delayed: allBaggage?.filter((b: any) => b.baggageStatus === "delayed" || b.baggageStatus === "lost").length || 0,
  };
  const checkinStats = {
    total: allCheckins?.length || 0,
    boarded: allCheckins?.filter((c: any) => c.checkinStatus === "boarded").length || 0,
    notChecked: allCheckins?.filter((c: any) => c.checkinStatus === "not_checked_in").length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Luggage className="h-6 w-6 text-primary" />{t("admin.baggageCheckin.t1", "수화물 & 체크인 관리")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.baggageCheckin.t2", "수화물 추적 상태 및 체크인 정보를 관리합니다")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMeetup} onValueChange={setSelectedMeetup}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("admin.baggageCheckin.t47", "밋업 선택")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.baggageCheckin.t3", "전체 밋업")}</SelectItem>
              {meetups?.map((m: any) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { refetchBaggage(); refetchCheckins(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Luggage className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{baggageStats.total}</p>
            <p className="text-xs text-muted-foreground">{t("admin.baggageCheckin.t4", "등록 수화물")}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="h-6 w-6 text-emerald-400 mx-auto mb-1 flex items-center justify-center text-lg">✅</div>
            <p className="text-2xl font-bold">{baggageStats.claimed}</p>
            <p className="text-xs text-muted-foreground">{t("admin.baggageCheckin.t5", "수령 완료")}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <DoorOpen className="h-6 w-6 text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-bold">{checkinStats.total}</p>
            <p className="text-xs text-muted-foreground">{t("admin.baggageCheckin.t6", "체크인 등록")}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Plane className="h-6 w-6 text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-bold">{checkinStats.boarded}</p>
            <p className="text-xs text-muted-foreground">{t("admin.baggageCheckin.t7", "탑승 완료")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="baggage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="baggage">
            <Luggage className="h-4 w-4 mr-1" />수화물 추적 ({filteredBaggage?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="checkin">
            <DoorOpen className="h-4 w-4 mr-1" />체크인 정보 ({filteredCheckins?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* 수화물 탭 */}
        <TabsContent value="baggage">
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t8", "참석자")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t9", "태그번호")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t10", "종류")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t11", "무게")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t12", "상태")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t13", "태그사진")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t14", "작업")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!filteredBaggage || filteredBaggage.length === 0) ? (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{t("admin.baggageCheckin.t15", "등록된 수화물이 없습니다.")}</td></tr>
                    ) : filteredBaggage.map((b: any) => {
                      const status = baggageStatusLabels[b.baggageStatus] || { label: b.baggageStatus, color: "bg-slate-500/20" };
                      return (
                        <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/30">
                          <td className="p-3">{getRegName(b.registrationId)}</td>
                          <td className="p-3 font-mono">{b.tagNumber || "-"}</td>
                          <td className="p-3">{b.baggageType || "일반"}</td>
                          <td className="p-3">{b.weight || "-"}</td>
                          <td className="p-3">
                            <Select
                              value={b.baggageStatus}
                              onValueChange={(val) => updateBaggageStatus.mutate({ id: b.id, baggageStatus: val as any })}
                            >
                              <SelectTrigger className="w-[110px] h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(baggageStatusLabels).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3">
                            {b.tagPhotoUrl ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader><DialogTitle>{t("admin.baggageCheckin.t16", "수화물 태그 사진")}</DialogTitle></DialogHeader>
                                  <img src={b.tagPhotoUrl} alt="태그" className="w-full rounded-lg" />
                                  {b.ocrResult && (
                                    <div className="bg-secondary rounded-lg p-3 text-sm space-y-1">
                                      <p><strong>{t("admin.baggageCheckin.t17", "태그번호:")}</strong> {b.ocrResult.tagNumber}</p>
                                      <p><strong>{t("admin.baggageCheckin.t18", "항공사:")}</strong> {b.ocrResult.airline}</p>
                                      <p><strong>{t("admin.baggageCheckin.t19", "목적지:")}</strong> {b.ocrResult.destination}</p>
                                      <p><strong>{t("admin.baggageCheckin.t20", "신뢰도:")}</strong> {b.ocrResult.confidence}</p>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                            ) : <span className="text-xs text-muted-foreground">{t("admin.baggageCheckin.t21", "없음")}</span>}
                          </td>
                          <td className="p-3">
                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300"
                              onClick={() => { if (confirm("삭제하시겠습니까?")) deleteBaggage.mutate({ id: b.id }); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 체크인 탭 */}
        <TabsContent value="checkin" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddCheckin} onOpenChange={setShowAddCheckin}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("admin.baggageCheckin.t22", "체크인 정보 등록")}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{t("admin.baggageCheckin.t23", "체크인 정보 등록")}</DialogTitle></DialogHeader>
                <form onSubmit={handleAddCheckin} className="space-y-4">
                  <div>
                    <Label>{t("admin.baggageCheckin.t24", "참석자")}</Label>
                    <Select
                      value={checkinForm.registrationId ? String(checkinForm.registrationId) : ""}
                      onValueChange={v => setCheckinForm(p => ({ ...p, registrationId: Number(v) }))}
                    >
                      <SelectTrigger><SelectValue placeholder={t("admin.baggageCheckin.t48", "참석자 선택")} /></SelectTrigger>
                      <SelectContent>
                        {regs?.filter((r: any) => r.status === "approved").map((r: any) => (
                          <SelectItem key={r.id} value={String(r.id)}>{r.name} ({r.phone})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{t("admin.baggageCheckin.t25", "항공사")}</Label>
                      <Input value={checkinForm.airline} onChange={e => setCheckinForm(p => ({ ...p, airline: e.target.value }))} placeholder={t("admin.baggageCheckin.t49", "대한항공")} />
                    </div>
                    <div>
                      <Label>{t("admin.baggageCheckin.t26", "편명")}</Label>
                      <Input value={checkinForm.flightNo} onChange={e => setCheckinForm(p => ({ ...p, flightNo: e.target.value }))} placeholder="KE001" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>{t("admin.baggageCheckin.t27", "카운터")}</Label>
                      <Input value={checkinForm.checkinCounter} onChange={e => setCheckinForm(p => ({ ...p, checkinCounter: e.target.value }))} placeholder="A1-A5" />
                    </div>
                    <div>
                      <Label>{t("admin.baggageCheckin.t28", "게이트")}</Label>
                      <Input value={checkinForm.gateNumber} onChange={e => setCheckinForm(p => ({ ...p, gateNumber: e.target.value }))} placeholder="Gate 12" />
                    </div>
                    <div>
                      <Label>{t("admin.baggageCheckin.t29", "좌석")}</Label>
                      <Input value={checkinForm.seatNumber} onChange={e => setCheckinForm(p => ({ ...p, seatNumber: e.target.value }))} placeholder="12A" />
                    </div>
                  </div>
                  <div>
                    <Label>{t("admin.baggageCheckin.t30", "탑승 시간")}</Label>
                    <Input type="datetime-local" value={checkinForm.boardingTime} onChange={e => setCheckinForm(p => ({ ...p, boardingTime: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{t("admin.baggageCheckin.t31", "메모")}</Label>
                    <Textarea value={checkinForm.notes} onChange={e => setCheckinForm(p => ({ ...p, notes: e.target.value }))} placeholder={t("admin.baggageCheckin.t50", "특이사항")} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createCheckin.isPending}>
                    {createCheckin.isPending ? "등록 중..." : "체크인 정보 등록"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t32", "참석자")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t33", "항공편")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t34", "카운터")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t35", "게이트")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t36", "좌석")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t37", "탑승시간")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t38", "상태")}</th>
                      <th className="p-3 font-medium">{t("admin.baggageCheckin.t39", "작업")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!filteredCheckins || filteredCheckins.length === 0) ? (
                      <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{t("admin.baggageCheckin.t40", "등록된 체크인 정보가 없습니다.")}</td></tr>
                    ) : filteredCheckins.map((c: any) => {
                      const status = checkinStatusLabels[c.checkinStatus] || { label: c.checkinStatus, color: "bg-slate-500/20" };
                      return (
                        <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                          <td className="p-3">{getRegName(c.registrationId)}</td>
                          <td className="p-3 font-mono">{c.airline} {c.flightNo}</td>
                          <td className="p-3">{c.checkinCounter || "-"}</td>
                          <td className="p-3">{c.gateNumber || "-"}</td>
                          <td className="p-3">{c.seatNumber || "-"}</td>
                          <td className="p-3 text-xs">
                            {c.boardingTime ? new Date(c.boardingTime).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                          </td>
                          <td className="p-3">
                            <Select
                              value={c.checkinStatus}
                              onValueChange={(val) => updateCheckin.mutate({ id: c.id, checkinStatus: val as any })}
                            >
                              <SelectTrigger className="w-[100px] h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(checkinStatusLabels).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3">
                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300"
                              onClick={() => { if (confirm("삭제하시겠습니까?")) deleteCheckin.mutate({ id: c.id }); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
