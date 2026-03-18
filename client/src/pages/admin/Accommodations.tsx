import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Hotel, Plus, Wand2, Trash2, Users } from "lucide-react";

const roomTypeLabels: Record<string, string> = { single: "싱글", double: "더블", twin: "트윈", suite: "스위트" };

export default function AdminAccommodations() {
  const { data: meetups = [] } = trpc.meetup.list.useQuery();
  const [selectedMeetup, setSelectedMeetup] = useState<number | undefined>();
  const { data: accommodations = [], refetch } = trpc.accommodation.list.useQuery({ meetupId: selectedMeetup });
  const [createOpen, setCreateOpen] = useState(false);

  const createMut = trpc.accommodation.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); toast.success("숙소 등록 완료"); } });
  const deleteMut = trpc.accommodation.delete.useMutation({ onSuccess: () => { refetch(); toast.success("삭제 완료"); } });
  const autoAssignMut = trpc.accommodation.autoAssign.useMutation({ onSuccess: (data) => { refetch(); toast.success(`${data.roomCount}개 객실에 ${data.totalAssigned}명 자동 배치 완료`); } });

  const [form, setForm] = useState({ hotelName: "", roomNumber: "", roomType: "twin" as "single" | "double" | "twin" | "suite", checkIn: "", checkOut: "" });
  const [autoHotelName, setAutoHotelName] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Hotel className="h-6 w-6 text-primary" /> 숙소 배치 관리</h1>
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
                <DialogHeader><DialogTitle>숙소 자동 배치 (2인1실)</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">승인된 참가자를 2인1실로 자동 배치합니다. 룸메이트 희망자를 우선 매칭합니다.</p>
                  <div><Label>호텔명 *</Label><Input value={autoHotelName} onChange={e => setAutoHotelName(e.target.value)} placeholder="호텔명 입력" className="mt-1" /></div>
                  <Button className="w-full" disabled={!autoHotelName || autoAssignMut.isPending}
                    onClick={() => autoAssignMut.mutate({ meetupId: selectedMeetup!, hotelName: autoHotelName })}>
                    {autoAssignMut.isPending ? "배치 중..." : "자동 배치 실행"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> 객실 추가</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>객실 등록</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>호텔명 *</Label><Input value={form.hotelName} onChange={e => setForm(p => ({ ...p, hotelName: e.target.value }))} className="mt-1" /></div>
                  <div><Label>객실 번호</Label><Input value={form.roomNumber} onChange={e => setForm(p => ({ ...p, roomNumber: e.target.value }))} className="mt-1" /></div>
                </div>
                <div><Label>객실 유형</Label>
                  <select value={form.roomType} onChange={e => setForm(p => ({ ...p, roomType: e.target.value as any }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    {Object.entries(roomTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>체크인</Label><Input type="datetime-local" value={form.checkIn} onChange={e => setForm(p => ({ ...p, checkIn: e.target.value }))} className="mt-1" /></div>
                  <div><Label>체크아웃</Label><Input type="datetime-local" value={form.checkOut} onChange={e => setForm(p => ({ ...p, checkOut: e.target.value }))} className="mt-1" /></div>
                </div>
                <Button className="w-full" disabled={!form.hotelName || createMut.isPending} onClick={() => createMut.mutate({
                  ...form, meetupId: selectedMeetup,
                  checkIn: form.checkIn ? new Date(form.checkIn).toISOString() : undefined,
                  checkOut: form.checkOut ? new Date(form.checkOut).toISOString() : undefined,
                })}>{createMut.isPending ? "등록 중..." : "등록"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accommodations.length === 0 ? (
          <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">배치된 숙소가 없습니다.</CardContent></Card>
        ) : accommodations.map((a: any) => (
          <Card key={a.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Hotel className="h-4 w-4" /> {a.hotelName}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { if (confirm("삭제?")) deleteMut.mutate({ id: a.id }); }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {a.roomNumber && <span className="font-medium">Room {a.roomNumber}</span>}
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{roomTypeLabels[a.roomType]}</span>
              </div>
              <p className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                배정: {Array.isArray(a.assignedRegistrationIds) ? (a.assignedRegistrationIds as number[]).length : 0}명
              </p>
              {Array.isArray(a.assignedRegistrationIds) && (a.assignedRegistrationIds as number[]).length > 0 && (
                <p className="text-xs text-muted-foreground">신청 ID: {(a.assignedRegistrationIds as number[]).join(", ")}</p>
              )}
              {a.checkIn && <p className="text-xs text-muted-foreground">체크인: {new Date(a.checkIn).toLocaleString("ko-KR")}</p>}
              {a.checkOut && <p className="text-xs text-muted-foreground">체크아웃: {new Date(a.checkOut).toLocaleString("ko-KR")}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
