import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Hotel, Plus, Wand2, Trash2, Users, Sparkles, CheckSquare, Square, Building2, Home, TreePine } from "lucide-react";
import { useTranslation } from "react-i18next";
import AIUploader from "@/components/AIUploader";
import { ExcelToolbar, fetchTrpcQuery } from "@/components/ExcelButtons";

const ACCOMMODATION_TYPES = ["hotel", "villa", "apartment", "resort", "pension", "other"] as const;
const ROOM_TYPES = ["single", "double", "twin", "suite", "family", "dormitory"] as const;

export default function AdminAccommodations() {
  const { t } = useTranslation();
  const roomTypeLabels: Record<string, string> = {
    single: t("admin.accommodations.single", "싱글"),
    double: t("admin.accommodations.double", "더블"),
    twin: t("admin.accommodations.twin", "트윈"),
    suite: t("admin.accommodations.suite", "스위트"),
    family: "패밀리",
    dormitory: "도미토리",
  };
  const accommodationTypeLabels: Record<string, string> = {
    hotel: "호텔", villa: "별장", apartment: "아파트", resort: "리조트", pension: "펜션", other: "기타",
  };
  const accommodationTypeIcons: Record<string, any> = {
    hotel: Hotel, villa: Home, apartment: Building2, resort: TreePine, pension: Home, other: Hotel,
  };

  const { data: meetups = [] } = trpc.meetup.list.useQuery();
  const [selectedMeetup, setSelectedMeetup] = useState<number | undefined>();
  const { data: accommodations = [], refetch } = trpc.accommodation.list.useQuery({ meetupId: selectedMeetup });
  const [createOpen, setCreateOpen] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [photoDialogId, setPhotoDialogId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterType, setFilterType] = useState<string>("all");

  const createMut = trpc.accommodation.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); resetForm(); toast.success("숙소가 등록되었습니다"); } });
  const deleteMut = trpc.accommodation.delete.useMutation({ onSuccess: () => { refetch(); toast.success("삭제되었습니다"); } });
  const bulkDeleteMut = trpc.accommodation.bulkDelete.useMutation({ onSuccess: (data) => { refetch(); setSelectedIds(new Set()); toast.success(`${data.deleted}개 삭제됨`); } });
  const deleteAllMut = trpc.accommodation.deleteAll.useMutation({ onSuccess: (data) => { refetch(); setSelectedIds(new Set()); toast.success(`전체 ${data.deleted}개 삭제됨`); } });
  const autoAssignMut = trpc.accommodation.autoAssign.useMutation({ onSuccess: (data) => { refetch(); toast.success(`${data.roomCount}개 방 배정 (${data.totalAssigned}명)`); } });
  const aiAssignMut = trpc.accommodation.aiAssign.useMutation({
    onSuccess: (data) => { refetch(); setAiPromptOpen(false); setAiPrompt(""); toast.success(`AI 배정 완료: ${data.success}/${data.total}개 성공`); },
    onError: (err) => { toast.error(`AI 배정 실패: ${err.message}`); },
  });

  const [form, setForm] = useState({
    hotelName: "", roomNumber: "",
    roomType: "twin" as typeof ROOM_TYPES[number],
    accommodationType: "hotel" as typeof ACCOMMODATION_TYPES[number],
    checkIn: "", checkOut: "", accommodationPhotoUrl: "",
  });
  const [autoHotelName, setAutoHotelName] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  const resetForm = () => setForm({ hotelName: "", roomNumber: "", roomType: "twin", accommodationType: "hotel", checkIn: "", checkOut: "", accommodationPhotoUrl: "" });

  const handleAIExtracted = (data: any, imageUrl?: string) => {
    setForm(prev => ({
      ...prev,
      hotelName: data.hotelName || prev.hotelName,
      roomNumber: data.roomNumber || prev.roomNumber,
      roomType: (ROOM_TYPES.includes(data.roomType?.toLowerCase()) ? data.roomType.toLowerCase() : prev.roomType) as any,
      accommodationType: (ACCOMMODATION_TYPES.includes(data.accommodationType?.toLowerCase()) ? data.accommodationType.toLowerCase() : prev.accommodationType) as any,
      checkIn: data.checkIn ? data.checkIn.substring(0, 16) : prev.checkIn,
      checkOut: data.checkOut ? data.checkOut.substring(0, 16) : prev.checkOut,
      accommodationPhotoUrl: imageUrl || prev.accommodationPhotoUrl,
    }));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAccommodations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAccommodations.map((a: any) => a.id)));
    }
  };

  const filteredAccommodations = useMemo(() => {
    if (filterType === "all") return accommodations;
    return accommodations.filter((a: any) => a.accommodationType === filterType);
  }, [accommodations, filterType]);

  // Group accommodations by hotelName
  const groupedAccommodations = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const a of filteredAccommodations) {
      const key = (a as any).hotelName || "미정";
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }
    return groups;
  }, [filteredAccommodations]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Hotel className="h-6 w-6 text-primary" /> 숙소 관리</h1>
        <div className="flex gap-2 flex-wrap">
          <ExcelToolbar
            templateFetch={() => fetchTrpcQuery("excelExport.accommodationTemplate")}
            exportFetch={() => fetchTrpcQuery("excelExport.exportAccommodations", { meetupId: selectedMeetup })}
          />
          <select value={selectedMeetup || ""} onChange={e => setSelectedMeetup(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">전체 밋업</option>
            {meetups.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter by accommodation type */}
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">전체 유형</option>
          {ACCOMMODATION_TYPES.map(t => <option key={t} value={t}>{accommodationTypeLabels[t]}</option>)}
        </select>

        {/* AI Prompt Button */}
        <Dialog open={aiPromptOpen} onOpenChange={setAiPromptOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2"><Sparkles className="h-4 w-4" /> AI 프롬프트 배정</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI 숙소 배정</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                숙소 배정 정보를 자유 형식으로 입력하면 AI가 자동으로 파싱하여 등록합니다.
              </p>
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md space-y-1">
                <p className="font-medium">입력 예시:</p>
                <p>별장1: 김철수, 이영희, 박민준</p>
                <p>별장2 (1호실): 최수진, 정하늘 / (2호실): 강민수</p>
                <p>리조트A 101호: 홍길동, 이순신 (체크인 5/10)</p>
              </div>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="숙소 배정 정보를 입력하세요..."
                className="w-full h-40 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button className="w-full gap-2" disabled={!aiPrompt.trim() || aiAssignMut.isPending}
                onClick={() => aiAssignMut.mutate({ prompt: aiPrompt, meetupId: selectedMeetup })}>
                <Sparkles className="h-4 w-4" />
                {aiAssignMut.isPending ? "AI 분석 중..." : "AI 배정 실행"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Auto Assign */}
        {selectedMeetup && (
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" className="gap-2"><Wand2 className="h-4 w-4" /> 자동 배치</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>2인1실 자동 배치</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">승인된 참가자를 2인1실로 자동 배치합니다.</p>
                <div><Label>숙소명 *</Label><Input value={autoHotelName} onChange={e => setAutoHotelName(e.target.value)} className="mt-1" /></div>
                <Button className="w-full" disabled={!autoHotelName || autoAssignMut.isPending}
                  onClick={() => autoAssignMut.mutate({ meetupId: selectedMeetup!, hotelName: autoHotelName })}>
                  {autoAssignMut.isPending ? "..." : "자동 배치 실행"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Room */}
        <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> 방 추가</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>숙소 등록</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <AIUploader context="accommodation" onExtracted={handleAIExtracted} compact />
              {form.accommodationPhotoUrl && (
                <div className="relative">
                  <img loading="lazy" decoding="async" src={form.accommodationPhotoUrl} alt="accommodation" className="w-full h-32 object-cover rounded-md border border-border" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>숙소명 *</Label><Input value={form.hotelName} onChange={e => setForm(p => ({ ...p, hotelName: e.target.value }))} className="mt-1" /></div>
                <div><Label>방 번호</Label><Input value={form.roomNumber} onChange={e => setForm(p => ({ ...p, roomNumber: e.target.value }))} className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>숙소 유형</Label>
                  <select value={form.accommodationType} onChange={e => setForm(p => ({ ...p, accommodationType: e.target.value as any }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    {ACCOMMODATION_TYPES.map(t => <option key={t} value={t}>{accommodationTypeLabels[t]}</option>)}
                  </select>
                </div>
                <div><Label>방 유형</Label>
                  <select value={form.roomType} onChange={e => setForm(p => ({ ...p, roomType: e.target.value as any }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    {ROOM_TYPES.map(t => <option key={t} value={t}>{roomTypeLabels[t]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>체크인</Label><Input type="datetime-local" value={form.checkIn} onChange={e => setForm(p => ({ ...p, checkIn: e.target.value }))} className="mt-1" /></div>
                <div><Label>체크아웃</Label><Input type="datetime-local" value={form.checkOut} onChange={e => setForm(p => ({ ...p, checkOut: e.target.value }))} className="mt-1" /></div>
              </div>
              <Button className="w-full" disabled={!form.hotelName || createMut.isPending} onClick={() => createMut.mutate({
                ...form, meetupId: selectedMeetup,
                checkIn: form.checkIn ? new Date(form.checkIn).toISOString() : undefined,
                checkOut: form.checkOut ? new Date(form.checkOut).toISOString() : undefined,
              })}>{createMut.isPending ? "..." : "등록"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete */}
        {selectedIds.size > 0 && (
          <Button variant="destructive" className="gap-2" onClick={() => {
            if (confirm(`선택한 ${selectedIds.size}개를 삭제하시겠습니까?`)) {
              bulkDeleteMut.mutate({ ids: Array.from(selectedIds) });
            }
          }}>
            <Trash2 className="h-4 w-4" /> {selectedIds.size}개 삭제
          </Button>
        )}

        {/* Delete All */}
        {accommodations.length > 0 && (
          <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => {
            if (confirm(`정말 전체 ${accommodations.length}개를 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
              deleteAllMut.mutate({ meetupId: selectedMeetup, confirm: true });
            }
          }}>
            <Trash2 className="h-3.5 w-3.5" /> 전체 삭제
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>총 {filteredAccommodations.length}개 방</span>
        <span>|</span>
        <span>{Object.keys(groupedAccommodations).length}개 숙소</span>
        {selectedIds.size > 0 && <><span>|</span><span className="text-primary font-medium">{selectedIds.size}개 선택됨</span></>}
      </div>

      {/* Select All Toggle */}
      {filteredAccommodations.length > 0 && (
        <div className="flex items-center gap-2 cursor-pointer" onClick={toggleSelectAll}>
          {selectedIds.size === filteredAccommodations.length ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm text-muted-foreground">전체 선택</span>
        </div>
      )}

      {/* Grouped Display */}
      {Object.entries(groupedAccommodations).map(([hotelName, rooms]) => {
        const accType = (rooms[0] as any)?.accommodationType || "hotel";
        const TypeIcon = accommodationTypeIcons[accType] || Hotel;
        return (
          <div key={hotelName} className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <TypeIcon className="h-5 w-5 text-primary" />
              {hotelName}
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {accommodationTypeLabels[accType]} · {rooms.length}개 방
              </span>
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rooms.map((a: any) => (
                <Card key={a.id} className={`relative transition-all ${selectedIds.has(a.id) ? "ring-2 ring-primary" : ""}`}>
                  <div className="absolute top-2 left-2 z-10 cursor-pointer" onClick={() => toggleSelect(a.id)}>
                    {selectedIds.has(a.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground/50" />}
                  </div>
                  <CardHeader className="pb-2 pt-3 pl-8">
                    {a.accommodationPhotoUrl && (
                      <div className="relative mb-2 cursor-pointer" onClick={() => setPhotoDialogId(a.id)}>
                        <img loading="lazy" decoding="async" src={a.accommodationPhotoUrl} alt={a.hotelName} className="w-full h-24 object-cover rounded-md" />
                      </div>
                    )}
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {a.roomNumber && <span className="font-bold">{a.roomNumber}호</span>}
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{roomTypeLabels[a.roomType] || a.roomType}</span>
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteMut.mutate({ id: a.id })}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs pb-3">
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      배정: {Array.isArray(a.assignedRegistrationIds) ? a.assignedRegistrationIds.length : 0}명
                    </p>
                    {a.checkIn && <p className="text-muted-foreground">체크인: {new Date(a.checkIn).toLocaleDateString()}</p>}
                    {a.notes && <p className="text-muted-foreground truncate">{a.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {filteredAccommodations.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Hotel className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>등록된 숙소가 없습니다</p>
          <p className="text-xs mt-1">AI 프롬프트 배정 또는 방 추가 버튼을 사용하세요</p>
        </CardContent></Card>
      )}

      {/* Photo Dialog */}
      {photoDialogId && (() => {
        const acc = accommodations.find((a: any) => a.id === photoDialogId);
        return acc ? (
          <Dialog open={!!photoDialogId} onOpenChange={() => setPhotoDialogId(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{(acc as any).hotelName} - {(acc as any).roomNumber}호</DialogTitle></DialogHeader>
              {(acc as any).accommodationPhotoUrl && (
                <img loading="lazy" decoding="async" src={(acc as any).accommodationPhotoUrl} alt={(acc as any).hotelName} className="w-full rounded-md" />
              )}
            </DialogContent>
          </Dialog>
        ) : null;
      })()}
    </div>
  );
}
