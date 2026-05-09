import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plane, Plus, AlertTriangle, Edit, Trash2, Users, Calendar, LayoutGrid, List } from "lucide-react";
import { useTranslation } from "react-i18next";

const statusColors: Record<string, string> = {
  scheduled: "secondary", boarding: "default", departed: "default", in_air: "default", landed: "default", delayed: "destructive", cancelled: "destructive",
};

export default function AdminFlights() {
  const { t } = useTranslation();
  const statusLabels: Record<string, string> = {
    scheduled: "예정", boarding: "탑승중", departed: "출발",
    in_air: "비행중", landed: "도착", delayed: "지연", cancelled: "취소",
  };

  const [meetupFilter, setMeetupFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");
  const { data: flights = [], refetch } = trpc.flight.list.useQuery({});
  const { data: meetups = [] } = trpc.meetup.list.useQuery({});
  const { data: delayed = [] } = trpc.flight.delayed.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const createMut = trpc.flight.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); toast.success("항공편 등록 완료"); } });
  const updateMut = trpc.flight.update.useMutation({ onSuccess: () => { refetch(); setEditId(null); toast.success("상태 업데이트 완료"); } });
  const deleteMut = trpc.flight.delete.useMutation({ onSuccess: () => { refetch(); toast.success("항공편 삭제 완료"); } });

  const [form, setForm] = useState({ flightNo: "", airline: "", departureAirport: "", arrivalAirport: "", scheduledDeparture: "", scheduledArrival: "", direction: "outbound" as "outbound" | "return", registrationId: "", meetupId: "" });
  const [editForm, setEditForm] = useState({ flightStatus: "scheduled", delayMinutes: 0, actualDeparture: "", actualArrival: "" });

  // Build meetup name map
  const meetupMap = useMemo(() => {
    const map: Record<number, string> = {};
    meetups.forEach((m: any) => { map[m.id] = m.title; });
    return map;
  }, [meetups]);

  // Filter flights by meetup
  const filteredFlights = useMemo(() => {
    if (meetupFilter === "all") return flights;
    if (meetupFilter === "none") return flights.filter((f: any) => !f.meetupId);
    return flights.filter((f: any) => f.meetupId === Number(meetupFilter));
  }, [flights, meetupFilter]);

  // Group by flight number for consolidated view
  const groupedByFlight = useMemo(() => {
    const groups: Record<string, { flightNo: string; airline: string; departure: string; arrival: string; time: string; direction: string; flights: any[] }> = {};
    filteredFlights.forEach((f: any) => {
      const key = `${f.flightNo}-${f.departureAirport}-${f.arrivalAirport}-${f.direction}`;
      if (!groups[key]) {
        groups[key] = {
          flightNo: f.flightNo,
          airline: f.airline || "",
          departure: f.departureAirport || "",
          arrival: f.arrivalAirport || "",
          time: f.scheduledDeparture || "",
          direction: f.direction,
          flights: [],
        };
      }
      groups[key].flights.push(f);
    });
    return Object.values(groups);
  }, [filteredFlights]);

  // Group by meetup for overview
  const groupedByMeetup = useMemo(() => {
    const groups: Record<string, { meetupId: number | null; meetupTitle: string; flights: any[] }> = {};
    filteredFlights.forEach((f: any) => {
      const key = f.meetupId ? String(f.meetupId) : "unassigned";
      if (!groups[key]) {
        groups[key] = {
          meetupId: f.meetupId,
          meetupTitle: f.meetupId ? (meetupMap[f.meetupId] || `행사 #${f.meetupId}`) : "미배정",
          flights: [],
        };
      }
      groups[key].flights.push(f);
    });
    return Object.values(groups);
  }, [filteredFlights, meetupMap]);

  // Stats
  const stats = useMemo(() => {
    const total = flights.length;
    const outbound = flights.filter((f: any) => f.direction === "outbound").length;
    const returnF = flights.filter((f: any) => f.direction === "return").length;
    const delayedCount = flights.filter((f: any) => f.flightStatus === "delayed").length;
    const uniqueFlights = new Set(flights.map((f: any) => f.flightNo)).size;
    return { total, outbound, returnF, delayedCount, uniqueFlights };
  }, [flights]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Plane className="h-6 w-6 text-primary" /> 항공편 관리
        </h1>
        <div className="flex items-center gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> 항공편 추가</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>항공편 등록</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>행사 선택</Label>
                  <Select value={form.meetupId} onValueChange={v => setForm(p => ({ ...p, meetupId: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="행사 선택 (선택사항)" /></SelectTrigger>
                    <SelectContent>
                      {meetups.map((m: any) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>편명 *</Label><Input value={form.flightNo} onChange={e => setForm(p => ({ ...p, flightNo: e.target.value }))} placeholder="KE651" className="mt-1" /></div>
                  <div><Label>항공사</Label><Input value={form.airline} onChange={e => setForm(p => ({ ...p, airline: e.target.value }))} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>출발 공항</Label><Input value={form.departureAirport} onChange={e => setForm(p => ({ ...p, departureAirport: e.target.value }))} placeholder="ICN T2" className="mt-1" /></div>
                  <div><Label>도착 공항</Label><Input value={form.arrivalAirport} onChange={e => setForm(p => ({ ...p, arrivalAirport: e.target.value }))} placeholder="HAN T2" className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>출발 시간</Label><Input type="datetime-local" value={form.scheduledDeparture} onChange={e => setForm(p => ({ ...p, scheduledDeparture: e.target.value }))} className="mt-1" /></div>
                  <div><Label>도착 시간</Label><Input type="datetime-local" value={form.scheduledArrival} onChange={e => setForm(p => ({ ...p, scheduledArrival: e.target.value }))} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>방향</Label>
                    <select value={form.direction} onChange={e => setForm(p => ({ ...p, direction: e.target.value as any }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="outbound">출국</option><option value="return">귀국</option>
                    </select>
                  </div>
                  <div><Label>신청 ID</Label><Input value={form.registrationId} onChange={e => setForm(p => ({ ...p, registrationId: e.target.value }))} className="mt-1" placeholder="선택사항" /></div>
                </div>
                <Button className="w-full" disabled={!form.flightNo || createMut.isPending} onClick={() => createMut.mutate({
                  ...form, registrationId: form.registrationId ? Number(form.registrationId) : undefined,
                  meetupId: form.meetupId ? Number(form.meetupId) : undefined,
                  scheduledDeparture: form.scheduledDeparture ? new Date(form.scheduledDeparture).toISOString() : undefined,
                  scheduledArrival: form.scheduledArrival ? new Date(form.scheduledArrival).toISOString() : undefined,
                })}>{createMut.isPending ? "..." : "등록"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-blue-500/30"><CardContent className="py-3 text-center">
          <p className="text-xs text-muted-foreground">전체</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card className="border-green-500/30"><CardContent className="py-3 text-center">
          <p className="text-xs text-muted-foreground">고유 편명</p>
          <p className="text-xl font-bold">{stats.uniqueFlights}</p>
        </CardContent></Card>
        <Card className="border-purple-500/30"><CardContent className="py-3 text-center">
          <p className="text-xs text-muted-foreground">출국</p>
          <p className="text-xl font-bold">{stats.outbound}</p>
        </CardContent></Card>
        <Card className="border-cyan-500/30"><CardContent className="py-3 text-center">
          <p className="text-xs text-muted-foreground">귀국</p>
          <p className="text-xl font-bold">{stats.returnF}</p>
        </CardContent></Card>
        <Card className="border-yellow-500/30"><CardContent className="py-3 text-center">
          <p className="text-xs text-muted-foreground">지연</p>
          <p className="text-xl font-bold text-yellow-500">{stats.delayedCount}</p>
        </CardContent></Card>
      </div>

      {/* Delayed Alert */}
      {delayed.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-500 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> 지연 항공편 ({delayed.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {delayed.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{f.flightNo} ({f.departureAirport} → {f.arrivalAirport})</span>
                  <Badge variant="destructive" className="text-xs">{f.delayMinutes}분 지연</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter & View Mode */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">행사 필터:</Label>
          <Select value={meetupFilter} onValueChange={setMeetupFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 행사</SelectItem>
              <SelectItem value="none">미배정</SelectItem>
              {meetups.map((m: any) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 border rounded-md p-0.5">
          <Button variant={viewMode === "grouped" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grouped")} className="h-7 px-2">
            <LayoutGrid className="h-3.5 w-3.5 mr-1" /> 행사별
          </Button>
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-7 px-2">
            <List className="h-3.5 w-3.5 mr-1" /> 편명별
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredFlights.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">등록된 항공편이 없습니다</CardContent></Card>
      ) : viewMode === "grouped" ? (
        /* ===== 행사별 그룹 뷰 ===== */
        <div className="space-y-6">
          {groupedByMeetup.map((group) => (
            <Card key={group.meetupId ?? "none"} className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/30 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {group.meetupTitle}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" /> {group.flights.length}편
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {group.flights.map((f: any) => (
                    <div key={f.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-20 text-center">
                          <span className="font-bold text-sm">{f.flightNo}</span>
                          {f.airline && <p className="text-[10px] text-muted-foreground">{f.airline}</p>}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{f.departureAirport || "?"}</span>
                          <span className="mx-2 text-muted-foreground">→</span>
                          <span className="font-medium">{f.arrivalAirport || "?"}</span>
                        </div>
                        <Badge variant={statusColors[f.flightStatus] as any} className="text-[10px]">{statusLabels[f.flightStatus]}</Badge>
                        <Badge variant="outline" className="text-[10px]">{f.direction === "outbound" ? "출국" : "귀국"}</Badge>
                        {f.scheduledDeparture && <span className="text-xs text-muted-foreground">{new Date(f.scheduledDeparture).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                        {(f.delayMinutes ?? 0) > 0 && <Badge variant="destructive" className="text-[10px]">{f.delayMinutes}분 지연</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Dialog open={editId === f.id} onOpenChange={open => { if (open) { setEditId(f.id); setEditForm({ flightStatus: f.flightStatus, delayMinutes: f.delayMinutes || 0, actualDeparture: "", actualArrival: "" }); } else setEditId(null); }}>
                          <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>상태 업데이트 - {f.flightNo}</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div><Label>상태</Label>
                                <select value={editForm.flightStatus} onChange={e => setEditForm(p => ({ ...p, flightStatus: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                              </div>
                              <div><Label>지연 시간 (분)</Label><Input type="number" value={editForm.delayMinutes} onChange={e => setEditForm(p => ({ ...p, delayMinutes: Number(e.target.value) }))} className="mt-1" /></div>
                              <div><Label>실제 출발</Label><Input type="datetime-local" value={editForm.actualDeparture} onChange={e => setEditForm(p => ({ ...p, actualDeparture: e.target.value }))} className="mt-1" /></div>
                              <div><Label>실제 도착</Label><Input type="datetime-local" value={editForm.actualArrival} onChange={e => setEditForm(p => ({ ...p, actualArrival: e.target.value }))} className="mt-1" /></div>
                              <Button className="w-full" disabled={updateMut.isPending} onClick={() => updateMut.mutate({
                                id: f.id, flightStatus: editForm.flightStatus as any, delayMinutes: editForm.delayMinutes,
                                actualDeparture: editForm.actualDeparture ? new Date(editForm.actualDeparture).toISOString() : undefined,
                                actualArrival: editForm.actualArrival ? new Date(editForm.actualArrival).toISOString() : undefined,
                              })}>업데이트</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { if (confirm("삭제하시겠습니까?")) deleteMut.mutate({ id: f.id }); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* ===== 편명별 통합 뷰 ===== */
        <div className="space-y-4">
          {groupedByFlight.map((group) => (
            <Card key={`${group.flightNo}-${group.departure}-${group.arrival}-${group.direction}`} className="overflow-hidden">
              <CardHeader className="pb-2 bg-muted/20 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Plane className="h-4 w-4 text-primary" />
                    <span className="font-bold">{group.flightNo}</span>
                    {group.airline && <span className="text-sm text-muted-foreground">({group.airline})</span>}
                    <span className="text-sm">{group.departure} → {group.arrival}</span>
                    <Badge variant="outline" className="text-[10px]">{group.direction === "outbound" ? "출국" : "귀국"}</Badge>
                  </div>
                  <Badge className="text-xs">{group.flights.length}건</Badge>
                </div>
                {group.time && <p className="text-xs text-muted-foreground ml-7">{new Date(group.time).toLocaleString("ko-KR")}</p>}
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {group.flights.map((f: any) => (
                    <div key={f.id} className="px-4 py-2 flex items-center justify-between hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {f.meetupId ? (meetupMap[f.meetupId] || `행사#${f.meetupId}`) : "미배정"}
                        </Badge>
                        <Badge variant={statusColors[f.flightStatus] as any} className="text-[10px]">{statusLabels[f.flightStatus]}</Badge>
                        {f.registrationId && <span className="text-[10px] text-muted-foreground">신청#{f.registrationId}</span>}
                        {(f.delayMinutes ?? 0) > 0 && <Badge variant="destructive" className="text-[10px]">{f.delayMinutes}분 지연</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Dialog open={editId === f.id} onOpenChange={open => { if (open) { setEditId(f.id); setEditForm({ flightStatus: f.flightStatus, delayMinutes: f.delayMinutes || 0, actualDeparture: "", actualArrival: "" }); } else setEditId(null); }}>
                          <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Edit className="h-3 w-3" /></Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>상태 업데이트 - {f.flightNo}</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div><Label>상태</Label>
                                <select value={editForm.flightStatus} onChange={e => setEditForm(p => ({ ...p, flightStatus: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                              </div>
                              <div><Label>지연 시간 (분)</Label><Input type="number" value={editForm.delayMinutes} onChange={e => setEditForm(p => ({ ...p, delayMinutes: Number(e.target.value) }))} className="mt-1" /></div>
                              <div><Label>실제 출발</Label><Input type="datetime-local" value={editForm.actualDeparture} onChange={e => setEditForm(p => ({ ...p, actualDeparture: e.target.value }))} className="mt-1" /></div>
                              <div><Label>실제 도착</Label><Input type="datetime-local" value={editForm.actualArrival} onChange={e => setEditForm(p => ({ ...p, actualArrival: e.target.value }))} className="mt-1" /></div>
                              <Button className="w-full" disabled={updateMut.isPending} onClick={() => updateMut.mutate({
                                id: f.id, flightStatus: editForm.flightStatus as any, delayMinutes: editForm.delayMinutes,
                                actualDeparture: editForm.actualDeparture ? new Date(editForm.actualDeparture).toISOString() : undefined,
                                actualArrival: editForm.actualArrival ? new Date(editForm.actualArrival).toISOString() : undefined,
                              })}>업데이트</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { if (confirm("삭제?")) deleteMut.mutate({ id: f.id }); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
