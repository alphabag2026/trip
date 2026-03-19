import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, MapPin, Calendar, Luggage, Edit } from "lucide-react";
import { toast } from "sonner";

export default function AdminMeetups() {
  const [showCreate, setShowCreate] = useState(false);
  const [editBaggageId, setEditBaggageId] = useState<number | null>(null);
  const [editBaggageText, setEditBaggageText] = useState("");
  const { data: meetups, refetch } = trpc.meetup.list.useQuery();
  const createMutation = trpc.meetup.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); toast.success("밋업이 생성되었습니다."); }});
  const deleteMutation = trpc.meetup.delete.useMutation({ onSuccess: () => { refetch(); toast.success("삭제되었습니다."); }});
  const updateMutation = trpc.meetup.update.useMutation({ onSuccess: () => { refetch(); toast.success("업데이트되었습니다."); }});

  const [form, setForm] = useState({
    title: "", type: "meetup" as const, locationType: "domestic" as const,
    destinationCountry: "", location: "", description: "",
    scheduleStart: "", scheduleEnd: "", maxParticipants: 0,
    baggageNotice: "초과화물은 직접부담할 수 있습니다.",
  });

  const typeLabels: Record<string, string> = {
    meetup: "밋업", pre_visit: "사전방문", event: "이벤트", meeting: "미팅", other: "기타"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">밋업 관리</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />새 밋업</Button>
      </div>

      <div className="grid gap-4">
        {meetups?.map((m: any) => (
          <Card key={m.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{m.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location || "미정"}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">{typeLabels[m.type]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${m.locationType === "overseas" ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400"}`}>
                      {m.locationType === "overseas" ? "해외" : "내륙"}
                    </span>
                  </div>
                  {m.scheduleStart && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(m.scheduleStart).toLocaleDateString("ko-KR")}
                      {m.scheduleEnd && ` ~ ${new Date(m.scheduleEnd).toLocaleDateString("ko-KR")}`}
                    </p>
                  )}
                  {/* 수화물 공지 표시 */}
                  <div className="flex items-center gap-2 mt-2">
                    <Luggage className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-400/80 truncate">{m.baggageNotice || "초과화물은 직접부담할 수 있습니다."}</span>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                      onClick={() => { setEditBaggageId(m.id); setEditBaggageText(m.baggageNotice || "초과화물은 직접부담할 수 있습니다."); }}
                    ><Edit className="h-3 w-3" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Select value={m.status} onValueChange={v => updateMutation.mutate({ id: m.id, status: v as any })}>
                    <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">초안</SelectItem>
                      <SelectItem value="open">모집중</SelectItem>
                      <SelectItem value="closed">마감</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                    if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: m.id });
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!meetups || meetups.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">등록된 밋업이 없습니다.</div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>새 밋업 생성</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate({
            ...form,
            maxParticipants: form.maxParticipants || undefined,
            scheduleStart: form.scheduleStart || undefined,
            scheduleEnd: form.scheduleEnd || undefined,
            destinationCountry: form.destinationCountry || undefined,
            location: form.location || undefined,
            description: form.description || undefined,
            baggageNotice: form.baggageNotice || undefined,
          }); }} className="space-y-4">
            <div><Label>제목 *</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>유형</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({...p, type: v as any}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meetup">밋업</SelectItem>
                    <SelectItem value="pre_visit">사전방문</SelectItem>
                    <SelectItem value="event">이벤트</SelectItem>
                    <SelectItem value="meeting">미팅</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>구분</Label>
                <Select value={form.locationType} onValueChange={v => setForm(p => ({...p, locationType: v as any}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domestic">내륙</SelectItem>
                    <SelectItem value="overseas">해외</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>장소</Label><Input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>시작일</Label><Input type="date" value={form.scheduleStart} onChange={e => setForm(p => ({...p, scheduleStart: e.target.value}))} /></div>
              <div><Label>종료일</Label><Input type="date" value={form.scheduleEnd} onChange={e => setForm(p => ({...p, scheduleEnd: e.target.value}))} /></div>
            </div>
            <div><Label>설명</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3} /></div>
            {/* 수화물 공지 */}
            <div>
              <Label className="flex items-center gap-2"><Luggage className="h-4 w-4 text-amber-500" />수화물 공지</Label>
              <Textarea
                value={form.baggageNotice}
                onChange={e => setForm(p => ({...p, baggageNotice: e.target.value}))}
                placeholder="초과화물은 직접부담할 수 있습니다."
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">신청 페이지에 표시될 수화물 안내 문구입니다.</p>
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>생성</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Baggage Notice Dialog */}
      <Dialog open={editBaggageId !== null} onOpenChange={open => { if (!open) setEditBaggageId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Luggage className="h-5 w-5 text-amber-500" />수화물 공지 수정</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editBaggageText}
              onChange={e => setEditBaggageText(e.target.value)}
              placeholder="수화물 관련 공지사항을 입력하세요"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">참석자 신청 페이지에 표시되는 수화물 안내 문구입니다.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditBaggageId(null)}>취소</Button>
              <Button className="flex-1" onClick={() => {
                if (editBaggageId) {
                  updateMutation.mutate({ id: editBaggageId, baggageNotice: editBaggageText });
                  setEditBaggageId(null);
                }
              }}>저장</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
