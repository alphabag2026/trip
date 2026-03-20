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
import { Hotel, Search, Users, DoorOpen, Download, Plus, Trash2, Edit, Upload, Send, FileSpreadsheet } from "lucide-react";
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
  const bulkAssignMut = trpc.hotelRoomNotify.bulkAssignCsv.useMutation({
    onSuccess: (data: { success: boolean; matched: number; errors: string[] }) => {
      rooms.refetch();
      toast.success(`${data.matched}건 배정 완료${data.errors.length > 0 ? ` (${data.errors.length}건 실패)` : ""}`);
      if (data.errors.length > 0) {
        data.errors.forEach((err: string) => toast.error(err));
      }
      setShowBulkDialog(false);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const notifyAssignMut = trpc.hotelRoomNotify.assignAndNotify.useMutation({
    onSuccess: () => { rooms.refetch(); toast.success("방 배정 및 텔레그램 알림 발송 완료"); setAssignDialog({ open: false, roomNumber: "", floor: "", notes: "" }); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<Array<{name: string; phone: string; roomNumber: string; floor?: string; notes?: string}>>([]);

  function parseCsvInput(text: string) {
    const lines = text.trim().split("\n").filter(l => l.trim());
    const result: Array<{name: string; phone: string; roomNumber: string; floor?: string; notes?: string}> = [];
    for (const line of lines) {
      const parts = line.split(",").map(s => s.trim());
      if (parts.length >= 3) {
        result.push({ name: parts[0], phone: parts[1], roomNumber: parts[2], floor: parts[3] || undefined, notes: parts[4] || undefined });
      }
    }
    return result;
  }

  function handleCsvFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      // BOM 제거 및 헤더 스킵
      const lines = text.replace(/^\uFEFF/, "").trim().split("\n");
      const dataLines = lines.filter(l => !l.startsWith("이름") && !l.toLowerCase().startsWith("name"));
      setCsvText(dataLines.join("\n"));
      setCsvPreview(parseCsvInput(dataLines.join("\n")));
    };
    reader.readAsText(file, "utf-8");
  }

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
          <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(true)}><Upload className="w-4 h-4 mr-1" />일괄 배정</Button>

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

      {/* CSV 일괄 배정 다이얼로그 */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" /> CSV 일괄 방 배정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">CSV 형식:</p>
              <code className="text-xs">이름,전화번호,방번호,층(선택),메모(선택)</code>
              <p className="text-xs text-muted-foreground mt-1">예: 홍길동,010-1234-5678,301,3,금연실</p>
            </div>
            <div>
              <Label>CSV 파일 업로드</Label>
              <Input type="file" accept=".csv,.txt" onChange={handleCsvFileUpload} className="mt-1" />
            </div>
            <div>
              <Label>또는 직접 입력</Label>
              <Textarea
                placeholder="이름,전화번호,방번호,층,메모&#10;홍길동,010-1234-5678,301,3,금연실"
                value={csvText}
                onChange={e => { setCsvText(e.target.value); setCsvPreview(parseCsvInput(e.target.value)); }}
                rows={5}
              />
            </div>
            {csvPreview.length > 0 && (
              <div>
                <Label>미리보기 ({csvPreview.length}건)</Label>
                <div className="border rounded-lg max-h-40 overflow-y-auto mt-1">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b bg-muted"><th className="p-1.5 text-left">이름</th><th className="p-1.5 text-left">전화</th><th className="p-1.5 text-left">방</th><th className="p-1.5 text-left">층</th></tr></thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="border-b"><td className="p-1.5">{row.name}</td><td className="p-1.5">{row.phone}</td><td className="p-1.5">{row.roomNumber}</td><td className="p-1.5">{row.floor || "-"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>취소</Button>
            <Button
              disabled={csvPreview.length === 0 || bulkAssignMut.isPending}
              onClick={() => bulkAssignMut.mutate({ assignments: csvPreview, sendNotification: true })}
            >
              {bulkAssignMut.isPending ? "배정 중..." : `${csvPreview.length}건 일괄 배정`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, roomNumber: "", floor: "", notes: "" })}>취소</Button>
            <Button
              variant="outline"
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
              {assignMut.isPending ? "저장 중..." : "배정만"}
            </Button>
            <Button
              disabled={!assignDialog.roomNumber || notifyAssignMut.isPending}
              onClick={() => {
                if (!assignDialog.regId) return;
                notifyAssignMut.mutate({
                  registrationId: assignDialog.regId,
                  roomNumber: assignDialog.roomNumber,
                  floor: assignDialog.floor || undefined,
                  notes: assignDialog.notes || undefined,
                });
              }}
            >
              <Send className="w-4 h-4 mr-1" />
              {notifyAssignMut.isPending ? "발송 중..." : "배정 + 알림"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
