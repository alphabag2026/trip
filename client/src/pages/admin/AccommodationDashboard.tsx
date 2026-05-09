import { useMemo, useState, useCallback, useRef, useEffect, DragEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Hotel, Users, Building2, Home, TreePine, BedDouble,
  UserCheck, UserX, ChevronDown, ChevronUp, Search,
  Download, GripVertical, X, ArrowRight, Filter, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";

const ACCOMMODATION_TYPE_LABELS: Record<string, string> = {
  hotel: "호텔", villa: "별장", apartment: "아파트", resort: "리조트", pension: "펜션", other: "기타",
};
const ACCOMMODATION_TYPE_ICONS: Record<string, any> = {
  hotel: Hotel, villa: Home, apartment: Building2, resort: TreePine, pension: Home, other: Hotel,
};
const ROOM_TYPE_LABELS: Record<string, string> = {
  single: "싱글", double: "더블", twin: "트윈", suite: "스위트", family: "패밀리", dormitory: "도미토리",
};

export default function AccommodationDashboard() {
  const { data: meetups = [] } = trpc.meetup.list.useQuery();
  const [selectedMeetup, setSelectedMeetup] = useState<number | undefined>();
  const { data: accommodations = [] } = trpc.accommodation.list.useQuery({ meetupId: selectedMeetup });
  const { data: registrations = [] } = trpc.registration.list.useQuery({ meetupId: selectedMeetup });
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedRegId, setHighlightedRegId] = useState<number | null>(null);
  const [highlightedAccomId, setHighlightedAccomId] = useState<number | null>(null);
  const [dragOverRoomId, setDragOverRoomId] = useState<number | null>(null);
  const [dragOverUnassigned, setDragOverUnassigned] = useState(false);
  const roomRefs = useRef<Record<number, HTMLDivElement | null>>({});
  // New: filters
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("all");
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  // New: confirm dialog for removal
  const [removeConfirm, setRemoveConfirm] = useState<{ accomId: number; regId: number; name: string } | null>(null);

  const utils = trpc.useUtils();
  const assignMutation = trpc.accommodation.assignToRoom.useMutation({
    onSuccess: () => { utils.accommodation.list.invalidate(); toast.success("배정 완료"); },
    onError: (e) => toast.error(e.message),
  });
  const removeMutation = trpc.accommodation.removeFromRoom.useMutation({
    onSuccess: () => { utils.accommodation.list.invalidate(); setRemoveConfirm(null); toast.success("배정 해제 완료"); },
    onError: (e) => toast.error(e.message),
  });
  const moveMutation = trpc.accommodation.moveToRoom.useMutation({
    onSuccess: () => { utils.accommodation.list.invalidate(); toast.success("이동 완료"); },
    onError: (e) => toast.error(e.message),
  });

  const regMap = useMemo(() => {
    const map: Record<number, { name: string; phone?: string; nationality?: string }> = {};
    for (const r of registrations as any[]) {
      map[r.id] = { name: r.name || r.englishName || `#${r.id}`, phone: r.phone, nationality: r.nationality };
    }
    return map;
  }, [registrations]);

  // Group accommodations by hotel name with filters applied
  const grouped = useMemo(() => {
    const groups: Record<string, { type: string; rooms: any[]; totalAssigned: number; totalCapacity: number }> = {};
    for (const a of accommodations as any[]) {
      // Apply room type filter
      if (roomTypeFilter !== "all" && a.roomType !== roomTypeFilter) continue;
      const assigned = Array.isArray(a.assignedRegistrationIds) ? a.assignedRegistrationIds.length : 0;
      const capacity = a.roomType === "single" ? 1 : a.roomType === "family" || a.roomType === "dormitory" ? 6 : 2;
      // Apply unassigned-only filter (show rooms with empty slots)
      if (showUnassignedOnly && assigned >= capacity) continue;
      const key = a.hotelName || "미정";
      if (!groups[key]) groups[key] = { type: a.accommodationType || "hotel", rooms: [], totalAssigned: 0, totalCapacity: 0 };
      groups[key].rooms.push({ ...a, assignedCount: assigned, capacity });
      groups[key].totalAssigned += assigned;
      groups[key].totalCapacity += capacity;
    }
    return groups;
  }, [accommodations, roomTypeFilter, showUnassignedOnly]);

  // Unassigned registrations (always computed from full data, not filtered)
  const unassignedRegs = useMemo(() => {
    const assignedSet = new Set<number>();
    for (const a of accommodations as any[]) {
      if (Array.isArray(a.assignedRegistrationIds)) {
        a.assignedRegistrationIds.forEach((id: number) => assignedSet.add(id));
      }
    }
    return (registrations as any[]).filter(r => !assignedSet.has(r.id));
  }, [accommodations, registrations]);

  // Stats (from full data)
  const stats = useMemo(() => {
    const totalRooms = (accommodations as any[]).length;
    const totalAssigned = (accommodations as any[]).reduce((sum, a) => sum + (Array.isArray(a.assignedRegistrationIds) ? a.assignedRegistrationIds.length : 0), 0);
    const totalRegistrations = (registrations as any[]).length;
    const unassigned = unassignedRegs.length;
    const hotelCount = new Set((accommodations as any[]).map(a => a.hotelName)).size;
    const assignRate = totalRegistrations > 0 ? Math.round((totalAssigned / totalRegistrations) * 100) : 0;
    return { totalRooms, totalAssigned, totalRegistrations, unassigned, hotelCount, assignRate };
  }, [accommodations, registrations, unassignedRegs]);

  // Available room types for filter
  const availableRoomTypes = useMemo(() => {
    const types = new Set<string>();
    for (const a of accommodations as any[]) { if (a.roomType) types.add(a.roomType); }
    return Array.from(types);
  }, [accommodations]);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) { setHighlightedRegId(null); setHighlightedAccomId(null); return; }
    const q = searchQuery.trim().toLowerCase();
    const foundReg = (registrations as any[]).find(r =>
      r.name?.toLowerCase().includes(q) || r.englishName?.toLowerCase().includes(q)
    );
    if (!foundReg) { toast.error("해당 이름의 참가자를 찾을 수 없습니다"); return; }
    setHighlightedRegId(foundReg.id);
    const foundAccom = (accommodations as any[]).find(a =>
      Array.isArray(a.assignedRegistrationIds) && a.assignedRegistrationIds.includes(foundReg.id)
    );
    if (foundAccom) {
      setHighlightedAccomId(foundAccom.id);
      setExpandedHotel(foundAccom.hotelName || "미정");
      toast.success(`${foundReg.name}: ${foundAccom.hotelName} ${foundAccom.roomNumber || ""}호`);
      setTimeout(() => { roomRefs.current[foundAccom.id]?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 200);
    } else {
      setHighlightedAccomId(null);
      toast.info(`${foundReg.name}: 미배정 상태입니다`);
    }
  }, [searchQuery, registrations, accommodations]);

  const handleDragStart = (e: DragEvent, regId: number, fromAccomId?: number) => {
    e.dataTransfer.setData("regId", String(regId));
    if (fromAccomId) e.dataTransfer.setData("fromAccomId", String(fromAccomId));
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDropOnRoom = (e: DragEvent, toAccomId: number) => {
    e.preventDefault(); setDragOverRoomId(null);
    const regId = Number(e.dataTransfer.getData("regId"));
    const fromAccomId = e.dataTransfer.getData("fromAccomId");
    if (!regId) return;
    if (fromAccomId) { moveMutation.mutate({ fromAccommodationId: Number(fromAccomId), toAccommodationId: toAccomId, registrationId: regId }); }
    else { assignMutation.mutate({ accommodationId: toAccomId, registrationId: regId }); }
  };
  const handleDropOnUnassigned = (e: DragEvent) => {
    e.preventDefault(); setDragOverUnassigned(false);
    const regId = Number(e.dataTransfer.getData("regId"));
    const fromAccomId = e.dataTransfer.getData("fromAccomId");
    if (!regId || !fromAccomId) return;
    const name = regMap[regId]?.name || `ID:${regId}`;
    setRemoveConfirm({ accomId: Number(fromAccomId), regId, name });
  };

  // ── Mobile Touch Drag & Drop ──
  const [touchDragRegId, setTouchDragRegId] = useState<number | null>(null);
  const [touchDragFromAccom, setTouchDragFromAccom] = useState<number | null>(null);
  const [touchActive, setTouchActive] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleTouchStart = useCallback((regId: number, fromAccomId?: number) => (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      setTouchDragRegId(regId);
      setTouchDragFromAccom(fromAccomId || null);
      setTouchActive(true);
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(50);
    }, 400); // 400ms long press
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchActive) {
      // Cancel long press if moved too much
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      }
      return;
    }
    e.preventDefault(); // Prevent scrolling while dragging
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    // Find the closest drop target
    const roomTarget = el?.closest('[data-room-id]');
    const unassignedTarget = el?.closest('[data-unassigned-zone]');
    if (roomTarget) {
      setDragOverRoomId(Number(roomTarget.getAttribute('data-room-id')));
      setDragOverUnassigned(false);
    } else if (unassignedTarget) {
      setDragOverRoomId(null);
      setDragOverUnassigned(true);
    } else {
      setDragOverRoomId(null);
      setDragOverUnassigned(false);
    }
  }, [touchActive]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (!touchActive || !touchDragRegId) { setTouchActive(false); return; }
    // Perform the drop action
    if (dragOverRoomId && touchDragRegId) {
      if (touchDragFromAccom) {
        moveMutation.mutate({ fromAccommodationId: touchDragFromAccom, toAccommodationId: dragOverRoomId, registrationId: touchDragRegId });
      } else {
        assignMutation.mutate({ accommodationId: dragOverRoomId, registrationId: touchDragRegId });
      }
    } else if (dragOverUnassigned && touchDragFromAccom && touchDragRegId) {
      const name = regMap[touchDragRegId]?.name || `ID:${touchDragRegId}`;
      setRemoveConfirm({ accomId: touchDragFromAccom, regId: touchDragRegId, name });
    }
    setTouchDragRegId(null);
    setTouchDragFromAccom(null);
    setTouchActive(false);
    setDragOverRoomId(null);
    setDragOverUnassigned(false);
  }, [touchActive, touchDragRegId, touchDragFromAccom, dragOverRoomId, dragOverUnassigned, regMap, assignMutation, moveMutation]);

  const handleExportExcel = useCallback(() => {
    const rows: string[][] = [];
    rows.push(["숙소명", "숙소유형", "방번호", "방유형", "배정인원수", "배정자 목록", "체크인", "체크아웃", "비고"]);
    for (const a of accommodations as any[]) {
      const assignedIds: number[] = Array.isArray(a.assignedRegistrationIds) ? a.assignedRegistrationIds : [];
      const names = assignedIds.map(id => regMap[id]?.name || `ID:${id}`).join(", ");
      rows.push([a.hotelName || "", ACCOMMODATION_TYPE_LABELS[a.accommodationType] || a.accommodationType || "",
        a.roomNumber || "", ROOM_TYPE_LABELS[a.roomType] || a.roomType || "", String(assignedIds.length), names,
        a.checkIn ? new Date(a.checkIn).toLocaleDateString() : "", a.checkOut ? new Date(a.checkOut).toLocaleDateString() : "", a.notes || ""]);
    }
    if (unassignedRegs.length > 0) {
      rows.push([]); rows.push(["미배정 참가자"]); rows.push(["이름", "전화번호", "국적"]);
      for (const r of unassignedRegs) { rows.push([r.name || r.englishName || "", r.phone || "", r.nationality || ""]); }
    }
    const bom = "\uFEFF";
    const csv = bom + rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `숙소배정현황_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("엑셀 파일 다운로드 완료");
  }, [accommodations, regMap, unassignedRegs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BedDouble className="h-6 w-6 text-primary" /> 숙소 배정 현황
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={selectedMeetup || ""} onChange={e => setSelectedMeetup(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">전체 밋업</option>
            {meetups.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
            <Download className="h-4 w-4" /> 엑셀 내보내기
          </Button>
        </div>
      </div>

      {/* Global Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">전체 배정 진행률</span>
            <span className="text-sm font-bold text-primary">{stats.assignRate}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                stats.assignRate >= 80 ? "bg-green-500" : stats.assignRate >= 50 ? "bg-yellow-500" : "bg-orange-500"
              }`}
              style={{ width: `${Math.min(stats.assignRate, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{stats.totalAssigned}명 배정 / {stats.totalRegistrations}명 총 참가자</span>
            <span>{stats.unassigned}명 미배정</span>
          </div>
        </CardContent>
      </Card>

      {/* Search + Filter Bar */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input placeholder="참가자 이름으로 검색 (배정된 방을 바로 찾습니다)" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="h-8 border-0 shadow-none focus-visible:ring-0 p-0" />
            {searchQuery && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                setSearchQuery(""); setHighlightedRegId(null); setHighlightedAccomId(null);
              }}><X className="h-3.5 w-3.5" /></Button>
            )}
            <Button size="sm" className="h-8 px-3" onClick={handleSearch}>검색</Button>
          </div>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select value={roomTypeFilter} onChange={e => setRoomTypeFilter(e.target.value)}
              className="h-7 rounded border border-input bg-background px-2 text-xs">
              <option value="all">전체 방 타입</option>
              {availableRoomTypes.map(t => <option key={t} value={t}>{ROOM_TYPE_LABELS[t] || t}</option>)}
            </select>
            <Button variant={showUnassignedOnly ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1 px-2"
              onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}>
              {showUnassignedOnly ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {showUnassignedOnly ? "빈 방만 보기 ON" : "빈 방만 보기"}
            </Button>
            {(roomTypeFilter !== "all" || showUnassignedOnly) && (
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => { setRoomTypeFilter("all"); setShowUnassignedOnly(false); }}>
                필터 초기화
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.hotelCount}</p>
          <p className="text-xs text-muted-foreground">숙소</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-500">{stats.totalRooms}</p>
          <p className="text-xs text-muted-foreground">총 방</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{stats.totalAssigned}</p>
          <p className="text-xs text-muted-foreground">배정 완료</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{stats.unassigned}</p>
          <p className="text-xs text-muted-foreground">미배정</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-purple-500">{stats.assignRate}%</p>
          <p className="text-xs text-muted-foreground">배정률</p>
        </CardContent></Card>
      </div>

      {/* Drag & Drop Guide */}
      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2 flex items-center gap-2">
        <GripVertical className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">참가자 이름을 드래그하여 원하는 방에 드롭하면 배정됩니다. 배정된 참가자를 다른 방으로 드래그하면 이동됩니다.</span>
        <span className="sm:hidden">이름을 길게 누르면 드래그 모드가 활성화됩니다. 원하는 방으로 이동하세요.</span>
      </div>
      {/* Mobile drag indicator */}
      {touchActive && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
          {regMap[touchDragRegId!]?.name || ""} 이동 중... 원하는 방에 손을 놓으세요
        </div>
      )}

      {/* Visual Map by Hotel */}
      {Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Hotel className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{roomTypeFilter !== "all" || showUnassignedOnly ? "필터 조건에 맞는 방이 없습니다" : "등록된 숙소가 없습니다"}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([hotelName, data]) => {
            const TypeIcon = ACCOMMODATION_TYPE_ICONS[data.type] || Hotel;
            const isExpanded = expandedHotel === hotelName;
            const occupancyRate = data.totalCapacity > 0 ? Math.round((data.totalAssigned / data.totalCapacity) * 100) : 0;
            return (
              <Card key={hotelName} className="overflow-hidden">
                <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpandedHotel(isExpanded ? null : hotelName)}>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TypeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold">{hotelName}</p>
                        <p className="text-xs text-muted-foreground font-normal">
                          {ACCOMMODATION_TYPE_LABELS[data.type]} · {data.rooms.length}개 방 · {data.totalAssigned}명 배정
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${occupancyRate >= 80 ? "bg-green-500" : occupancyRate >= 50 ? "bg-yellow-500" : "bg-orange-500"}`}
                            style={{ width: `${Math.min(occupancyRate, 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">{occupancyRate}%</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {data.rooms.map((room: any) => {
                        const assignedIds: number[] = Array.isArray(room.assignedRegistrationIds) ? room.assignedRegistrationIds : [];
                        const isFull = assignedIds.length >= room.capacity;
                        const isEmpty = assignedIds.length === 0;
                        const isHighlighted = highlightedAccomId === room.id;
                        const isDragOver = dragOverRoomId === room.id;
                        return (
                          <div key={room.id} ref={el => { roomRefs.current[room.id] = el; }}
                            data-room-id={room.id}
                            onDragOver={e => { handleDragOver(e); setDragOverRoomId(room.id); }}
                            onDragLeave={() => setDragOverRoomId(null)} onDrop={e => handleDropOnRoom(e, room.id)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              isDragOver ? "border-primary bg-primary/10 scale-[1.02]" :
                              isHighlighted ? "border-primary bg-primary/5 ring-2 ring-primary/30" :
                              isFull ? "border-green-500/30 bg-green-500/5" :
                              isEmpty ? "border-muted bg-muted/20" : "border-yellow-500/30 bg-yellow-500/5"
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-sm">{room.roomNumber ? `${room.roomNumber}호` : `방 #${room.id}`}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                isFull ? "bg-green-500/20 text-green-600" : isEmpty ? "bg-muted text-muted-foreground" : "bg-yellow-500/20 text-yellow-600"
                              }`}>{ROOM_TYPE_LABELS[room.roomType] || room.roomType}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <Users className="h-3 w-3" /><span>{assignedIds.length}/{room.capacity}명</span>
                            </div>
                            <div className="space-y-1">
                              {assignedIds.map((regId: number) => {
                                const person = regMap[regId];
                                const isSearchHighlighted = highlightedRegId === regId;
                                return (
                                  <div key={regId} draggable onDragStart={e => handleDragStart(e, regId, room.id)}
                                    onTouchStart={handleTouchStart(regId, room.id)}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    className={`flex items-center gap-1.5 text-xs cursor-grab active:cursor-grabbing group rounded px-1 py-0.5 select-none ${
                                      isSearchHighlighted ? "bg-primary/20 ring-1 ring-primary font-bold" : "hover:bg-muted/50"
                                    } ${touchDragRegId === regId ? "opacity-50 ring-2 ring-primary" : ""}`}>
                                    <GripVertical className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
                                    <UserCheck className="h-3 w-3 text-green-500 shrink-0" />
                                    <span className="truncate flex-1">{person?.name || `ID:${regId}`}</span>
                                    <button onClick={(e) => {
                                      e.stopPropagation();
                                      setRemoveConfirm({ accomId: room.id, regId, name: person?.name || `ID:${regId}` });
                                    }} className="opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 flex items-center justify-center rounded hover:bg-destructive/20" title="배정 해제">
                                      <X className="h-2.5 w-2.5 text-destructive" />
                                    </button>
                                  </div>
                                );
                              })}
                              {Array.from({ length: Math.max(0, room.capacity - assignedIds.length) }).map((_, i) => (
                                <div key={`empty-${i}`} className="flex items-center gap-1.5 text-xs text-muted-foreground/50 px-1 py-0.5">
                                  <div className="w-3" /><UserX className="h-3 w-3 shrink-0" />
                                  <span className="italic">빈 자리 (여기에 드롭)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Unassigned People List */}
      <Card data-unassigned-zone="true" onDragOver={e => { handleDragOver(e); setDragOverUnassigned(true); }}
        onDragLeave={() => setDragOverUnassigned(false)} onDrop={handleDropOnUnassigned}
        className={`transition-all ${dragOverUnassigned ? "border-2 border-orange-500 bg-orange-500/5" : ""}`}>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-orange-500" /> 미배정 참가자 ({unassignedRegs.length}명)
            </div>
            <span className="text-xs text-muted-foreground font-normal">
              <ArrowRight className="h-3 w-3 inline" /> 이름을 드래그하여 위 방에 드롭하세요
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unassignedRegs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">모든 참가자가 배정되었습니다</p>
          ) : (
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {unassignedRegs.map((r: any) => {
                const isSearchHighlighted = highlightedRegId === r.id;
                return (
                  <div key={r.id} draggable onDragStart={e => handleDragStart(e, r.id)}
                    onTouchStart={handleTouchStart(r.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded cursor-grab active:cursor-grabbing group transition-all select-none ${
                      isSearchHighlighted ? "bg-primary/20 ring-1 ring-primary font-bold" : "hover:bg-muted/50"
                    } ${touchDragRegId === r.id ? "opacity-50 ring-2 ring-primary" : ""}`}>
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
                    <UserX className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    <span className="truncate">{r.name || r.englishName}</span>
                    {r.nationality && <span className="text-xs text-muted-foreground">({r.nationality})</span>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!removeConfirm} onOpenChange={(open) => { if (!open) setRemoveConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>배정 해제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removeConfirm?.name}</strong>님의 숙소 배정을 해제하시겠습니까?<br />
              해제 후 미배정 목록으로 이동됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (removeConfirm) removeMutation.mutate({ accommodationId: removeConfirm.accomId, registrationId: removeConfirm.regId });
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              배정 해제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
