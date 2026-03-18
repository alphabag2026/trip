import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarDays, Plus, Edit, Trash2, Bell, MapPin, Clock, Send } from "lucide-react";

export default function AdminScheduleEvents() {
  const { data: meetups = [] } = trpc.meetup.list.useQuery();
  const [selectedMeetup, setSelectedMeetup] = useState<number | undefined>();
  const { data: events = [], refetch } = trpc.schedule.list.useQuery({ meetupId: selectedMeetup! }, { enabled: !!selectedMeetup });
  const [createOpen, setCreateOpen] = useState(false);

  const createMut = trpc.schedule.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); toast.success("일정 등록 완료"); } });
  const updateMut = trpc.schedule.update.useMutation({ onSuccess: () => { refetch(); toast.success("업데이트 완료"); } });
  const deleteMut = trpc.schedule.delete.useMutation({ onSuccess: () => { refetch(); toast.success("삭제 완료"); } });
  const notifyMut = trpc.schedule.triggerNotifications.useMutation({ onSuccess: () => toast.success("알림 전송 완료"), onError: () => toast.error("알림 전송 실패") });

  const [form, setForm] = useState({ title: "", description: "", location: "", eventTime: "", eventType: "meetup" as string, notifyBefore: 10 });

  const eventTypeLabels: Record<string, string> = { meetup: "밋업", transfer: "이동", meal: "식사", meeting: "미팅", free_time: "자유시간", departure: "출발", arrival: "도착", other: "기타" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" /> 스케줄 이벤트 관리</h1>
        <div className="flex gap-2">
          <select value={selectedMeetup || ""} onChange={e => setSelectedMeetup(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">밋업 선택</option>
            {meetups.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          {selectedMeetup && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> 일정 추가</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>일정 이벤트 등록</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>제목 *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="일정 제목" className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>유형</Label>
                      <select value={form.eventType} onChange={e => setForm(p => ({ ...p, eventType: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                        {Object.entries(eventTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div><Label>시간 *</Label><Input type="datetime-local" value={form.eventTime} onChange={e => setForm(p => ({ ...p, eventTime: e.target.value }))} className="mt-1" /></div>
                  </div>
                  <div><Label>장소</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="장소" className="mt-1" /></div>
                  <div><Label>설명</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="상세 설명" rows={2} className="mt-1" /></div>
                  <div><Label>사전 알림 (분)</Label><Input type="number" value={form.notifyBefore} onChange={e => setForm(p => ({ ...p, notifyBefore: Number(e.target.value) }))} className="mt-1" /></div>
                  <Button className="w-full" disabled={!form.title || !form.eventTime || createMut.isPending} onClick={() => createMut.mutate({
                    ...form, meetupId: selectedMeetup!, eventTime: new Date(form.eventTime).toISOString(),
                  })}>{createMut.isPending ? "등록 중..." : "등록"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!selectedMeetup ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">밋업을 선택해주세요.</CardContent></Card>
      ) : events.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">등록된 일정이 없습니다.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {events.map((event: any, idx: number) => {
            const eventTime = new Date(event.eventTime);
            const isUpcoming = eventTime.getTime() - Date.now() < (event.notifyBefore || 10) * 60 * 1000 && eventTime.getTime() > Date.now();
            return (
              <Card key={event.id} className={isUpcoming ? "ring-2 ring-yellow-500/50" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{idx + 1}</div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{event.title}</h3>
                          <Badge variant="outline" className="text-xs">{eventTypeLabels[event.eventType] || event.eventType}</Badge>
                          {isUpcoming && <Badge variant="secondary" className="text-xs text-yellow-500"><Bell className="h-3 w-3 mr-1" />곧 시작</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{eventTime.toLocaleString("ko-KR")}</span>
                          {event.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
                        </div>
                        {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">알림: {event.notifyBefore || 10}분 전 | 알림 발송: {event.notified ? "완료" : "대기"}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => notifyMut.mutate()} title="알림 전송">
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { if (confirm("삭제?")) deleteMut.mutate({ id: event.id }); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
