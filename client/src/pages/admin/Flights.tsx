import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plane, Plus, AlertTriangle, Edit, Trash2 } from "lucide-react";

const statusLabels: Record<string, string> = {
  scheduled: "예정", boarding: "탑승중", departed: "출발", in_air: "비행중", landed: "도착", delayed: "지연", cancelled: "취소",
};
const statusColors: Record<string, string> = {
  scheduled: "secondary", boarding: "default", departed: "default", in_air: "default", landed: "default", delayed: "destructive", cancelled: "destructive",
};

export default function AdminFlights() {
  const [meetupFilter] = useState<number | undefined>();
  const { data: flights = [], refetch } = trpc.flight.list.useQuery({ meetupId: meetupFilter });
  const { data: delayed = [] } = trpc.flight.delayed.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const createMut = trpc.flight.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); toast.success("항공편 등록 완료"); } });
  const updateMut = trpc.flight.update.useMutation({ onSuccess: () => { refetch(); setEditId(null); toast.success("업데이트 완료"); } });
  const deleteMut = trpc.flight.delete.useMutation({ onSuccess: () => { refetch(); toast.success("삭제 완료"); } });

  const [form, setForm] = useState({ flightNo: "", airline: "", departureAirport: "", arrivalAirport: "", scheduledDeparture: "", scheduledArrival: "", direction: "outbound" as "outbound" | "return", registrationId: "", meetupId: "" });
  const [editForm, setEditForm] = useState({ flightStatus: "scheduled", delayMinutes: 0, actualDeparture: "", actualArrival: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Plane className="h-6 w-6 text-primary" /> 항공편 관리</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> 항공편 등록</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>항공편 등록</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>편명 *</Label><Input value={form.flightNo} onChange={e => setForm(p => ({ ...p, flightNo: e.target.value }))} placeholder="KE651" className="mt-1" /></div>
                <div><Label>항공사</Label><Input value={form.airline} onChange={e => setForm(p => ({ ...p, airline: e.target.value }))} placeholder="대한항공" className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>출발 공항</Label><Input value={form.departureAirport} onChange={e => setForm(p => ({ ...p, departureAirport: e.target.value }))} placeholder="ICN" className="mt-1" /></div>
                <div><Label>도착 공항</Label><Input value={form.arrivalAirport} onChange={e => setForm(p => ({ ...p, arrivalAirport: e.target.value }))} placeholder="BKK" className="mt-1" /></div>
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
                <div><Label>신청 ID (선택)</Label><Input value={form.registrationId} onChange={e => setForm(p => ({ ...p, registrationId: e.target.value }))} placeholder="신청 ID" className="mt-1" /></div>
              </div>
              <Button className="w-full" disabled={!form.flightNo || createMut.isPending} onClick={() => createMut.mutate({
                ...form, registrationId: form.registrationId ? Number(form.registrationId) : undefined,
                meetupId: form.meetupId ? Number(form.meetupId) : undefined,
                scheduledDeparture: form.scheduledDeparture ? new Date(form.scheduledDeparture).toISOString() : undefined,
                scheduledArrival: form.scheduledArrival ? new Date(form.scheduledArrival).toISOString() : undefined,
              })}>{createMut.isPending ? "등록 중..." : "등록"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {delayed.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-500 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> 지연 항공편 ({delayed.length}건)</CardTitle></CardHeader>
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

      <div className="space-y-3">
        {flights.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">등록된 항공편이 없습니다.</CardContent></Card>
        ) : flights.map((f: any) => (
          <Card key={f.id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{f.flightNo}</span>
                    {f.airline && <span className="text-sm text-muted-foreground">({f.airline})</span>}
                    <Badge variant={statusColors[f.flightStatus] as any} className="text-xs">{statusLabels[f.flightStatus]}</Badge>
                    <Badge variant="outline" className="text-xs">{f.direction === "outbound" ? "출국" : "귀국"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{f.departureAirport} → {f.arrivalAirport}</p>
                  {f.scheduledDeparture && <p className="text-xs text-muted-foreground">예정: {new Date(f.scheduledDeparture).toLocaleString("ko-KR")}</p>}
                  {(f.delayMinutes ?? 0) > 0 && <p className="text-xs text-yellow-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {f.delayMinutes}분 지연</p>}
                </div>
                <div className="flex gap-2">
                  <Dialog open={editId === f.id} onOpenChange={open => { if (open) { setEditId(f.id); setEditForm({ flightStatus: f.flightStatus, delayMinutes: f.delayMinutes || 0, actualDeparture: "", actualArrival: "" }); } else setEditId(null); }}>
                    <DialogTrigger asChild><Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>항공편 상태 업데이트</DialogTitle></DialogHeader>
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
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm("삭제하시겠습니까?")) deleteMut.mutate({ id: f.id }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
