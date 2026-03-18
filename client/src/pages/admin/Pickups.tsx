import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Car, Plus, Wand2, Edit, Trash2, Users, MapPin, Phone } from "lucide-react";

const statusLabels: Record<string, string> = { pending: "대기", en_route: "이동중", waiting: "대기중", picked_up: "픽업완료", completed: "완료" };

export default function AdminPickups() {
  const { data: meetups = [] } = trpc.meetup.list.useQuery();
  const [selectedMeetup, setSelectedMeetup] = useState<number | undefined>();
  const { data: pickups = [], refetch } = trpc.pickup.list.useQuery({ meetupId: selectedMeetup });
  const [createOpen, setCreateOpen] = useState(false);

  const createMut = trpc.pickup.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); toast.success("차량 등록 완료"); } });
  const updateMut = trpc.pickup.update.useMutation({ onSuccess: () => { refetch(); toast.success("업데이트 완료"); } });
  const deleteMut = trpc.pickup.delete.useMutation({ onSuccess: () => { refetch(); toast.success("삭제 완료"); } });
  const autoAssignMut = trpc.pickup.autoAssign.useMutation({ onSuccess: (data) => { refetch(); toast.success(`${data.vehicleCount}대 차량에 ${data.totalAssigned}명 자동 배치 완료`); } });

  const [form, setForm] = useState({ vehicleName: "", vehicleCapacity: 4, driverName: "", driverPhone: "", pickupLocation: "", pickupTime: "" });
  const [autoCapacity, setAutoCapacity] = useState(4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Car className="h-6 w-6 text-primary" /> 픽업 배치 관리</h1>
        <div className="flex gap-2">
          <select value={selectedMeetup || ""} onChange={e => setSelectedMeetup(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">전체 밋업</option>
            {meetups.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          {selectedMeetup && (
            <Dialog>
              <DialogTrigger asChild><Button variant="outline"><Wand2 className="h-4 w-4 mr-2" /> 자동 배치</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>차량 자동 배치</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">승인된 참가자를 차량에 자동으로 배정합니다.</p>
                  <div><Label>차량당 인원</Label><Input type="number" value={autoCapacity} onChange={e => setAutoCapacity(Number(e.target.value))} min={1} max={20} className="mt-1" /></div>
                  <Button className="w-full" disabled={autoAssignMut.isPending} onClick={() => autoAssignMut.mutate({ meetupId: selectedMeetup!, vehicleCapacity: autoCapacity })}>
                    {autoAssignMut.isPending ? "배치 중..." : "자동 배치 실행"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> 차량 추가</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>차량 등록</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>차량명 *</Label><Input value={form.vehicleName} onChange={e => setForm(p => ({ ...p, vehicleName: e.target.value }))} placeholder="차량 1" className="mt-1" /></div>
                  <div><Label>정원</Label><Input type="number" value={form.vehicleCapacity} onChange={e => setForm(p => ({ ...p, vehicleCapacity: Number(e.target.value) }))} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>기사명</Label><Input value={form.driverName} onChange={e => setForm(p => ({ ...p, driverName: e.target.value }))} className="mt-1" /></div>
                  <div><Label>기사 연락처</Label><Input value={form.driverPhone} onChange={e => setForm(p => ({ ...p, driverPhone: e.target.value }))} className="mt-1" /></div>
                </div>
                <div><Label>픽업 장소</Label><Input value={form.pickupLocation} onChange={e => setForm(p => ({ ...p, pickupLocation: e.target.value }))} className="mt-1" /></div>
                <div><Label>픽업 시간</Label><Input type="datetime-local" value={form.pickupTime} onChange={e => setForm(p => ({ ...p, pickupTime: e.target.value }))} className="mt-1" /></div>
                <Button className="w-full" disabled={!form.vehicleName || createMut.isPending} onClick={() => createMut.mutate({
                  ...form, meetupId: selectedMeetup,
                  pickupTime: form.pickupTime ? new Date(form.pickupTime).toISOString() : undefined,
                })}>{createMut.isPending ? "등록 중..." : "등록"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pickups.length === 0 ? (
          <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">배치된 차량이 없습니다.</CardContent></Card>
        ) : pickups.map((p: any) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Car className="h-4 w-4" /> {p.vehicleName}</span>
                <div className="flex gap-1">
                  <select value={p.status} onChange={e => updateMut.mutate({ id: p.id, status: e.target.value as any })}
                    className="h-7 rounded border border-input bg-background px-2 text-xs">
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { if (confirm("삭제?")) deleteMut.mutate({ id: p.id }); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {p.driverName && <p className="flex items-center gap-1 text-muted-foreground"><Users className="h-3.5 w-3.5" /> {p.driverName} {p.driverPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.driverPhone}</span>}</p>}
              {p.pickupLocation && <p className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {p.pickupLocation}</p>}
              <p className="text-xs text-muted-foreground">탑승: {Array.isArray(p.assignedRegistrationIds) ? (p.assignedRegistrationIds as number[]).length : 0}/{p.vehicleCapacity}명</p>
              {Array.isArray(p.assignedRegistrationIds) && (p.assignedRegistrationIds as number[]).length > 0 && (
                <p className="text-xs text-muted-foreground">신청 ID: {(p.assignedRegistrationIds as number[]).join(", ")}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
