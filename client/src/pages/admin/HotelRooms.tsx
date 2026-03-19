import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Hotel, Search, Users, DoorOpen, Download, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export default function HotelRooms() {
  const [meetupId, setMeetupId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; regId?: number; name?: string; roomNumber: string; floor: string; notes: string }>({
    open: false, roomNumber: "", floor: "", notes: "",
  });

  const meetups = trpc.meetup.list.useQuery();
  const rooms = trpc.hotelRoom.list.useQuery({ meetupId });
  const assignMut = trpc.hotelRoom.assign.useMutation({
    onSuccess: () => { rooms.refetch(); toast.success("방 배정이 완료되었습니다"); setAssignDialog({ open: false, roomNumber: "", floor: "", notes: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const removeMut = trpc.hotelRoom.remove.useMutation({
    onSuccess: () => { rooms.refetch(); toast.success("방 배정이 해제되었습니다"); },
    onError: (e) => toast.error(e.message),
  });

  const allRegs = rooms.data || [];
  const assigned = allRegs.filter(r => r.hotelRoomNumber);
  const unassigned = allRegs.filter(r => !r.hotelRoomNumber);

  // 방 번호별 그룹핑
  const roomGroups: Record<string, typeof allRegs> = {};
  for (const r of assigned) {
    const key = `${r.hotelFloor || ""}F-${r.hotelRoomNumber}`;
    if (!roomGroups[key]) roomGroups[key] = [];
    roomGroups[key].push(r);
  }

  const filteredUnassigned = search
    ? unassigned.filter(r => r.name.includes(search) || r.phone.includes(search))
    : unassigned;

  const filteredGroups = search
    ? Object.fromEntries(
        Object.entries(roomGroups).filter(([key, regs]) =>
          key.includes(search) || regs.some(r => r.name.includes(search) || r.phone.includes(search))
        )
      )
    : roomGroups;

  const uniqueRooms = new Set(assigned.map(r => r.hotelRoomNumber));

  const exportCSV = () => {
    const rows = allRegs.map(r => [
      r.name, r.phone, r.hotelRoomNumber || "미배정", r.hotelFloor || "-", r.hotelNotes || "-",
    ]);
    const csv = "\uFEFF이름,전화번호,방번호,층,메모\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "hotel_rooms.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">호텔 방 배정 관리</h1>
          <p className="text-muted-foreground mt-1">투숙객의 방 번호를 배정하고 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Select value={meetupId?.toString() || "all"} onValueChange={v => setMeetupId(v === "all" ? undefined : Number(v))}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="전체 밋업" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 밋업</SelectItem>
              {(meetups.data || []).map(m => (
                <SelectItem key={m.id} value={m.id.toString()}>{m.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg"><Users className="w-5 h-5 text-blue-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">총 참석자</p>
                <p className="text-2xl font-bold">{allRegs.length}명</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg"><Hotel className="w-5 h-5 text-green-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">배정 완료</p>
                <p className="text-2xl font-bold">{assigned.length}명</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg"><DoorOpen className="w-5 h-5 text-orange-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">사용 객실</p>
                <p className="text-2xl font-bold">{uniqueRooms.size}실</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg"><Users className="w-5 h-5 text-red-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">미배정</p>
                <p className="text-2xl font-bold">{unassigned.length}명</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="이름, 전화번호, 방 번호로 검색..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* 배정된 방 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Hotel className="w-5 h-5" />배정된 객실 ({Object.keys(filteredGroups).length}실)</CardTitle>
          <CardDescription>방 번호별 투숙객 현황</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(filteredGroups).length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(filteredGroups).sort(([a], [b]) => a.localeCompare(b)).map(([key, regs]) => (
                <Card key={key} className="border-2">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-lg px-3 py-1">{regs[0].hotelRoomNumber}호</Badge>
                        {regs[0].hotelFloor && <Badge variant="outline">{regs[0].hotelFloor}층</Badge>}
                      </div>
                      <Badge variant="secondary">{regs.length}명</Badge>
                    </div>
                    <div className="space-y-2">
                      {regs.map(r => (
                        <div key={r.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{r.phone}</p>
                            {r.hotelNotes && <p className="text-xs text-yellow-500 mt-0.5">{r.hotelNotes}</p>}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAssignDialog({
                              open: true, regId: r.id, name: r.name,
                              roomNumber: r.hotelRoomNumber || "", floor: r.hotelFloor || "", notes: r.hotelNotes || "",
                            })}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => {
                              if (confirm(`${r.name}님의 방 배정을 해제하시겠습니까?`)) removeMut.mutate({ registrationId: r.id });
                            }}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">배정된 객실이 없습니다</p>
          )}
        </CardContent>
      </Card>

      {/* 미배정 참석자 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />미배정 참석자 ({filteredUnassigned.length}명)</CardTitle>
          <CardDescription>아직 방이 배정되지 않은 참석자입니다. 클릭하여 배정하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUnassigned.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {filteredUnassigned.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setAssignDialog({ open: true, regId: r.id, name: r.name, roomNumber: "", floor: "", notes: "" })}
                >
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-sm text-muted-foreground">{r.phone}</p>
                    {r.roommatePreference && (
                      <p className="text-xs text-blue-500">룸메이트 희망: {r.roommatePreference}</p>
                    )}
                  </div>
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {search ? "검색 결과가 없습니다" : "모든 참석자가 배정되었습니다"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 방 배정 다이얼로그 */}
      <Dialog open={assignDialog.open} onOpenChange={o => !o && setAssignDialog({ open: false, roomNumber: "", floor: "", notes: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>방 배정 - {assignDialog.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>방 번호 *</Label>
              <Input
                placeholder="예: 301, 1205"
                value={assignDialog.roomNumber}
                onChange={e => setAssignDialog(p => ({ ...p, roomNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label>층</Label>
              <Input
                placeholder="예: 3, 12"
                value={assignDialog.floor}
                onChange={e => setAssignDialog(p => ({ ...p, floor: e.target.value }))}
              />
            </div>
            <div>
              <Label>메모</Label>
              <Textarea
                placeholder="특이사항 (예: 금연실, 바다뷰, 장애인 편의시설 등)"
                value={assignDialog.notes}
                onChange={e => setAssignDialog(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, roomNumber: "", floor: "", notes: "" })}>취소</Button>
            <Button
              disabled={!assignDialog.roomNumber || assignMut.isPending}
              onClick={() => {
                if (!assignDialog.regId) return;
                assignMut.mutate({
                  registrationId: assignDialog.regId,
                  roomNumber: assignDialog.roomNumber,
                  floor: assignDialog.floor || undefined,
                  notes: assignDialog.notes || undefined,
                });
              }}
            >
              {assignMut.isPending ? "저장 중..." : "배정 완료"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
