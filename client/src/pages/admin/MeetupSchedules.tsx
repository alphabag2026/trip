import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Bell, Calendar, Car, UtensilsCrossed, MapPin, Users, Clock, Phone, ChevronDown, ChevronUp, ExternalLink, Download, Timer, CheckCircle, XCircle, HelpCircle, Send, BarChart3 } from "lucide-react";

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  transport: { label: "교통", icon: "🚗", color: "bg-blue-100 text-blue-800" },
  meal: { label: "식사", icon: "🍽️", color: "bg-orange-100 text-orange-800" },
  tour: { label: "관광", icon: "🗺️", color: "bg-green-100 text-green-800" },
  meeting: { label: "미팅", icon: "📋", color: "bg-purple-100 text-purple-800" },
  free: { label: "자유시간", icon: "🆓", color: "bg-gray-100 text-gray-800" },
  other: { label: "기타", icon: "📌", color: "bg-slate-100 text-slate-800" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: "예정", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "확정", color: "bg-green-100 text-green-800" },
  in_progress: { label: "진행중", color: "bg-blue-100 text-blue-800" },
  completed: { label: "완료", color: "bg-gray-100 text-gray-800" },
  cancelled: { label: "취소", color: "bg-red-100 text-red-800" },
};

const EMPTY_FORM = {
  scheduleType: "transport" as string,
  title: "", description: "", location: "", locationUrl: "",
  eventDate: "", endTime: "",
  vehicleInfo: "", driverName: "", driverPhone: "", pickupLocation: "", dropoffLocation: "",
  restaurantName: "", cuisineType: "", reservationName: "", reservationPhone: "", menuInfo: "", costPerPerson: "",
  maxParticipants: undefined as number | undefined,
  isAllParticipants: true,
  notes: "", sortOrder: 0,
};

export default function MeetupSchedules() {
  // toast from sonner
  const meetups = trpc.meetup.list.useQuery();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const schedules = trpc.meetupSchedule.list.useQuery(
    { meetupId: selectedMeetupId!, scheduleType: filterType !== "all" ? filterType as any : undefined },
    { enabled: !!selectedMeetupId }
  );

  const utils = trpc.useUtils();
  const createMut = trpc.meetupSchedule.create.useMutation({
    onSuccess: () => { utils.meetupSchedule.list.invalidate(); setShowForm(false); resetForm(); toast.success("일정이 등록되었습니다"); },
    onError: (e) => toast.error("오류: " + e.message),
  });
  const updateMut = trpc.meetupSchedule.update.useMutation({
    onSuccess: () => { utils.meetupSchedule.list.invalidate(); setShowForm(false); resetForm(); toast.success("일정이 수정되었습니다"); },
    onError: (e) => toast.error("오류: " + e.message),
  });
  const deleteMut = trpc.meetupSchedule.delete.useMutation({
    onSuccess: () => { utils.meetupSchedule.list.invalidate(); toast.success("일정이 삭제되었습니다"); },
  });
  const notifyMut = trpc.meetupSchedule.notify.useMutation({
    onSuccess: () => { utils.meetupSchedule.list.invalidate(); toast.success("참가자에게 알림이 전송되었습니다"); },
    onError: (e) => toast.error("알림 전송 실패: " + e.message),
  });

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(s: any) {
    setEditingId(s.id);
    setForm({
      scheduleType: s.scheduleType || "other",
      title: s.title || "", description: s.description || "",
      location: s.location || "", locationUrl: s.locationUrl || "",
      eventDate: s.eventDate ? new Date(s.eventDate).toISOString().slice(0, 16) : "",
      endTime: s.endTime ? new Date(s.endTime).toISOString().slice(0, 16) : "",
      vehicleInfo: s.vehicleInfo || "", driverName: s.driverName || "",
      driverPhone: s.driverPhone || "", pickupLocation: s.pickupLocation || "",
      dropoffLocation: s.dropoffLocation || "",
      restaurantName: s.restaurantName || "", cuisineType: s.cuisineType || "",
      reservationName: s.reservationName || "", reservationPhone: s.reservationPhone || "",
      menuInfo: s.menuInfo || "", costPerPerson: s.costPerPerson || "",
      maxParticipants: s.maxParticipants || undefined,
      isAllParticipants: s.isAllParticipants ?? true,
      notes: s.notes || "", sortOrder: s.sortOrder || 0,
    });
    setShowForm(true);
  }

  function handleSubmit() {
    if (!selectedMeetupId || !form.title || !form.eventDate) {
      toast.error("필수 항목을 입력해주세요");
      return;
    }
    const payload = {
      ...form,
      scheduleType: form.scheduleType as "transport" | "meal" | "tour" | "meeting" | "free" | "other",
      meetupId: selectedMeetupId,
      eventDate: new Date(form.eventDate).toISOString(),
      endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
      maxParticipants: form.maxParticipants || undefined,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }

  // 날짜별 그룹핑
  const groupedSchedules = useMemo(() => {
    if (!schedules.data) return {};
    const groups: Record<string, any[]> = {};
    for (const s of schedules.data) {
      const dateKey = new Date(s.eventDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(s);
    }
    return groups;
  }, [schedules.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">교통/식사 일정 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">밋업별 교통, 식사, 관광 일정을 등록하고 참가자에게 알림을 보냅니다</p>
        </div>
        {selectedMeetupId && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> 일정 등록
          </Button>
        )}
      </div>

      {/* 밋업 선택 + 유형 필터 */}
      <div className="flex gap-3 flex-wrap">
        <Select value={selectedMeetupId?.toString() || ""} onValueChange={(v) => setSelectedMeetupId(Number(v))}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="밋업을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {meetups.data?.map((m: any) => (
              <SelectItem key={m.id} value={m.id.toString()}>{m.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="transport">🚗 교통</SelectItem>
            <SelectItem value="meal">🍽️ 식사</SelectItem>
            <SelectItem value="tour">🗺️ 관광</SelectItem>
            <SelectItem value="meeting">📋 미팅</SelectItem>
            <SelectItem value="free">🆓 자유시간</SelectItem>
            <SelectItem value="other">📌 기타</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!selectedMeetupId ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">밋업을 선택해주세요</p>
            <p className="text-sm">교통/식사 일정을 관리할 밋업을 먼저 선택합니다</p>
          </CardContent>
        </Card>
      ) : schedules.isLoading ? (
        <div className="text-center py-16 text-muted-foreground">로딩 중...</div>
      ) : Object.keys(groupedSchedules).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">등록된 일정이 없습니다</p>
            <p className="text-sm mb-4">교통, 식사, 관광 일정을 등록해보세요</p>
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> 첫 일정 등록
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSchedules).map(([dateKey, items]) => (
            <div key={dateKey}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {dateKey}
              </h3>
              <div className="space-y-3">
                {items.map((s: any) => {
                  const typeInfo = TYPE_LABELS[s.scheduleType] || TYPE_LABELS.other;
                  const statusInfo = STATUS_LABELS[s.status] || STATUS_LABELS.scheduled;
                  const isExpanded = expandedId === s.id;
                  const time = new Date(s.eventDate).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
                  const endTimeStr = s.endTime ? new Date(s.endTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : null;

                  return (
                    <Card key={s.id} className={`transition-all ${s.status === "cancelled" ? "opacity-50" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="text-2xl mt-0.5">{typeInfo.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-base">{s.title}</span>
                                <Badge variant="outline" className={typeInfo.color}>{typeInfo.label}</Badge>
                                <Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge>
                                {s.notified && <Badge variant="outline" className="bg-emerald-50 text-emerald-700">알림완료</Badge>}
                              </div>
                              <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {time}{endTimeStr ? ` ~ ${endTimeStr}` : ""}</span>
                                {s.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {s.location}</span>}
                                {s.restaurantName && <span className="flex items-center gap-1"><UtensilsCrossed className="w-3.5 h-3.5" /> {s.restaurantName}</span>}
                                {s.pickupLocation && <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" /> {s.pickupLocation}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => notifyMut.mutate({ id: s.id, meetupId: selectedMeetupId! })} disabled={notifyMut.isPending} title="참가자 알림">
                              <Bell className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="수정">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("이 일정을 삭제하시겠습니까?")) deleteMut.mutate({ id: s.id }); }} title="삭제">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {/* 확장 상세 정보 */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-3 text-sm">
                            {s.description && <div><span className="font-medium">설명:</span> {s.description}</div>}
                            {/* 교통 상세 */}
                            {s.scheduleType === "transport" && (
                              <div className="grid grid-cols-2 gap-3">
                                {s.vehicleInfo && <div><span className="font-medium">차량정보:</span> {s.vehicleInfo}</div>}
                                {s.driverName && <div><span className="font-medium">기사:</span> {s.driverName}</div>}
                                {s.driverPhone && <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {s.driverPhone}</div>}
                                {s.pickupLocation && <div><span className="font-medium">픽업:</span> {s.pickupLocation}</div>}
                                {s.dropoffLocation && <div><span className="font-medium">하차:</span> {s.dropoffLocation}</div>}
                              </div>
                            )}
                            {/* 식사 상세 */}
                            {s.scheduleType === "meal" && (
                              <div className="grid grid-cols-2 gap-3">
                                {s.restaurantName && <div><span className="font-medium">식당:</span> {s.restaurantName}</div>}
                                {s.cuisineType && <div><span className="font-medium">종류:</span> {s.cuisineType}</div>}
                                {s.reservationName && <div><span className="font-medium">예약자:</span> {s.reservationName}</div>}
                                {s.reservationPhone && <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {s.reservationPhone}</div>}
                                {s.menuInfo && <div className="col-span-2"><span className="font-medium">메뉴:</span> {s.menuInfo}</div>}
                                {s.costPerPerson && <div><span className="font-medium">1인 비용:</span> {s.costPerPerson}</div>}
                              </div>
                            )}
                            {s.locationUrl && (
                              <a href={s.locationUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" /> 지도 보기
                              </a>
                            )}
                            {s.notes && <div className="bg-muted/50 p-3 rounded-md"><span className="font-medium">메모:</span> {s.notes}</div>}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="w-3.5 h-3.5" />
                              {s.isAllParticipants ? "전체 참가자 대상" : `지정 참가자 ${s.assignedRegistrationIds?.length || 0}명`}
                              {s.maxParticipants && ` (최대 ${s.maxParticipants}명)`}
                            </div>
                            <ScheduleCalendarButtons scheduleId={s.id} />
                            {/* 리마인더 설정 */}
                            <ScheduleReminderSection scheduleId={s.id} meetupId={selectedMeetupId!} />
                            {/* RSVP 현황 */}
                            <ScheduleRsvpSection scheduleId={s.id} meetupId={selectedMeetupId!} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "일정 수정" : "새 일정 등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">일정 유형 *</label>
                <Select value={form.scheduleType} onValueChange={(v) => setForm(f => ({ ...f, scheduleType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transport">🚗 교통</SelectItem>
                    <SelectItem value="meal">🍽️ 식사</SelectItem>
                    <SelectItem value="tour">🗺️ 관광</SelectItem>
                    <SelectItem value="meeting">📋 미팅</SelectItem>
                    <SelectItem value="free">🆓 자유시간</SelectItem>
                    <SelectItem value="other">📌 기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">정렬 순서</label>
                <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">일정 제목 *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="예: 공항 → 호텔 픽업" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">시작 시간 *</label>
                <Input type="datetime-local" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">종료 시간</label>
                <Input type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">장소</label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="장소명" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">지도 링크</label>
                <Input value={form.locationUrl} onChange={e => setForm(f => ({ ...f, locationUrl: e.target.value }))} placeholder="https://maps.google.com/..." />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">설명</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>

            {/* 교통 관련 필드 */}
            {form.scheduleType === "transport" && (
              <div className="border rounded-lg p-4 space-y-3 bg-blue-50/50">
                <h4 className="font-medium text-sm flex items-center gap-2"><Car className="w-4 h-4" /> 교통 정보</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input value={form.vehicleInfo} onChange={e => setForm(f => ({ ...f, vehicleInfo: e.target.value }))} placeholder="차량번호/차종" />
                  <Input value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} placeholder="기사 이름" />
                  <Input value={form.driverPhone} onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))} placeholder="기사 연락처" />
                  <Input value={form.pickupLocation} onChange={e => setForm(f => ({ ...f, pickupLocation: e.target.value }))} placeholder="픽업 장소" />
                  <Input value={form.dropoffLocation} onChange={e => setForm(f => ({ ...f, dropoffLocation: e.target.value }))} placeholder="하차 장소" className="col-span-2" />
                </div>
              </div>
            )}

            {/* 식사 관련 필드 */}
            {form.scheduleType === "meal" && (
              <div className="border rounded-lg p-4 space-y-3 bg-orange-50/50">
                <h4 className="font-medium text-sm flex items-center gap-2"><UtensilsCrossed className="w-4 h-4" /> 식사 정보</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input value={form.restaurantName} onChange={e => setForm(f => ({ ...f, restaurantName: e.target.value }))} placeholder="식당 이름" />
                  <Input value={form.cuisineType} onChange={e => setForm(f => ({ ...f, cuisineType: e.target.value }))} placeholder="음식 종류 (한식/양식 등)" />
                  <Input value={form.reservationName} onChange={e => setForm(f => ({ ...f, reservationName: e.target.value }))} placeholder="예약자 이름" />
                  <Input value={form.reservationPhone} onChange={e => setForm(f => ({ ...f, reservationPhone: e.target.value }))} placeholder="예약 연락처" />
                  <Input value={form.costPerPerson} onChange={e => setForm(f => ({ ...f, costPerPerson: e.target.value }))} placeholder="1인 비용" />
                </div>
                <Textarea value={form.menuInfo} onChange={e => setForm(f => ({ ...f, menuInfo: e.target.value }))} placeholder="메뉴 정보" rows={2} />
              </div>
            )}

            {/* 참가자 설정 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">최대 참가 인원</label>
                <Input type="number" value={form.maxParticipants || ""} onChange={e => setForm(f => ({ ...f, maxParticipants: e.target.value ? Number(e.target.value) : undefined }))} placeholder="제한 없음" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isAllParticipants} onChange={e => setForm(f => ({ ...f, isAllParticipants: e.target.checked }))} className="rounded" />
                  전체 참가자 대상
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">메모</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="추가 메모사항" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>취소</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "저장 중..." : editingId ? "수정 저장" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 개별 일정 캘린더 추가 버튼
function ScheduleCalendarButtons({ scheduleId }: { scheduleId: number }) {
  const { data, isLoading } = trpc.calendar.generateScheduleIcs.useQuery(
    { scheduleId },
    { enabled: !!scheduleId }
  );

  const handleDownloadIcs = () => {
    if (!data?.ics) return;
    const blob = new Blob([data.ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule-${scheduleId}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("캘린더 파일이 다운로드되었습니다");
  };

  const handleGoogleCalendar = () => {
    if (!data?.gcalUrl) return;
    window.open(data.gcalUrl, "_blank");
  };

  if (isLoading || !data) return null;

  return (
    <div className="flex items-center gap-2 pt-2 border-t border-border/30">
      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">캘린더 추가:</span>
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2" onClick={handleGoogleCalendar}>
        <ExternalLink className="w-3 h-3" /> Google
      </Button>
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2" onClick={handleDownloadIcs}>
        <Download className="w-3 h-3" /> .ics
      </Button>
    </div>
  );
}


// 리마인더 설정 섹션
function ScheduleReminderSection({ scheduleId, meetupId }: { scheduleId: number; meetupId: number }) {
  const [showAdd, setShowAdd] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const utils = trpc.useUtils();
  const reminders = trpc.scheduleReminder.list.useQuery({ scheduleId });
  const createReminder = trpc.scheduleReminder.create.useMutation({
    onSuccess: () => { utils.scheduleReminder.list.invalidate(); setShowAdd(false); toast.success("리마인더가 설정되었습니다"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteReminder = trpc.scheduleReminder.delete.useMutation({
    onSuccess: () => { utils.scheduleReminder.list.invalidate(); toast.success("리마인더가 삭제되었습니다"); },
  });
  const sendNow = trpc.scheduleReminder.sendNow.useMutation({
    onSuccess: () => toast.success("리마인더가 전송되었습니다"),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="pt-2 border-t border-border/30 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Timer className="w-3.5 h-3.5" /> 리마인더
          {reminders.data && reminders.data.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{reminders.data.length}개</Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => sendNow.mutate({ scheduleId, meetupId })} disabled={sendNow.isPending}>
            <Send className="w-3 h-3 mr-1" /> 즉시 전송
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-3 h-3 mr-1" /> 추가
          </Button>
        </div>
      </div>
      {showAdd && (
        <div className="flex items-center gap-2 bg-muted/30 p-2 rounded">
          <Select value={minutes.toString()} onValueChange={(v) => setMinutes(Number(v))}>
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15분 전</SelectItem>
              <SelectItem value="30">30분 전</SelectItem>
              <SelectItem value="60">1시간 전</SelectItem>
              <SelectItem value="120">2시간 전</SelectItem>
              <SelectItem value="1440">1일 전</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-xs" onClick={() => createReminder.mutate({ scheduleId, meetupId, reminderMinutes: minutes })} disabled={createReminder.isPending}>
            설정
          </Button>
        </div>
      )}
      {reminders.data && reminders.data.length > 0 && (
        <div className="space-y-1">
          {reminders.data.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between text-xs bg-muted/20 px-2 py-1 rounded">
              <span>
                {r.reminderMinutes >= 1440 ? `${Math.floor(r.reminderMinutes / 1440)}일 전` : r.reminderMinutes >= 60 ? `${Math.floor(r.reminderMinutes / 60)}시간 전` : `${r.reminderMinutes}분 전`}
                <Badge variant="outline" className={`ml-1.5 text-[9px] px-1 py-0 ${r.status === "sent" ? "bg-green-50 text-green-700" : r.status === "failed" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"}`}>
                  {r.status === "sent" ? "전송됨" : r.status === "failed" ? "실패" : "대기"}
                </Badge>
              </span>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => deleteReminder.mutate({ id: r.id })}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// RSVP 현황 섹션
function ScheduleRsvpSection({ scheduleId, meetupId }: { scheduleId: number; meetupId: number }) {
  const stats = trpc.scheduleRsvp.stats.useQuery({ scheduleId });
  const rsvpList = trpc.scheduleRsvp.list.useQuery({ scheduleId });
  const [showDetail, setShowDetail] = useState(false);
  const utils = trpc.useUtils();
  const sendRsvpReminder = trpc.scheduleReminder.sendRsvpReminder.useMutation({
    onSuccess: (data) => toast.success(`미응답자 ${data.noResponseCount}명에게 리마인더를 전송했습니다`),
    onError: (e) => toast.error(e.message),
  });

  const s = stats.data;
  if (!s || s.total === 0) {
    return (
      <div className="pt-2 border-t border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BarChart3 className="w-3.5 h-3.5" /> RSVP 현황: 아직 응답 없음
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => sendRsvpReminder.mutate({ scheduleId, meetupId })} disabled={sendRsvpReminder.isPending}>
            <Send className="w-3 h-3 mr-1" /> 응답 요청
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 border-t border-border/30 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground"><BarChart3 className="w-3.5 h-3.5" /> RSVP</span>
          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" /> {s.attending}</span>
          <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3 h-3" /> {s.not_attending}</span>
          <span className="flex items-center gap-1 text-yellow-600"><HelpCircle className="w-3 h-3" /> {s.maybe}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setShowDetail(!showDetail)}>
            {showDetail ? "접기" : "상세"}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => sendRsvpReminder.mutate({ scheduleId, meetupId })} disabled={sendRsvpReminder.isPending}>
            <Send className="w-3 h-3 mr-1" /> 미응답 알림
          </Button>
        </div>
      </div>
      {/* 진행 바 */}
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        {s.attending > 0 && <div className="bg-green-500" style={{ width: `${(s.attending / s.total) * 100}%` }} />}
        {s.not_attending > 0 && <div className="bg-red-400" style={{ width: `${(s.not_attending / s.total) * 100}%` }} />}
        {s.maybe > 0 && <div className="bg-yellow-400" style={{ width: `${(s.maybe / s.total) * 100}%` }} />}
      </div>
      {showDetail && rsvpList.data && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {rsvpList.data.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between text-xs bg-muted/20 px-2 py-1 rounded">
              <span>참가자 #{r.registrationId}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${r.response === "attending" ? "bg-green-50 text-green-700" : r.response === "not_attending" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"}`}>
                {r.response === "attending" ? "참석" : r.response === "not_attending" ? "불참" : "미정"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
