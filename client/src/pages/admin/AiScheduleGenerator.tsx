import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Loader2, Calendar, CheckCircle2, Clock, MapPin,
  Wand2, Save, Trash2, Edit, GripVertical, CalendarPlus,
} from "lucide-react";
import { toast } from "sonner";

interface GeneratedSchedule {
  title: string;
  location: string;
  eventTime: string;
  endTime: string;
  description: string;
  eventOrder: number;
}

export default function AdminAiScheduleGenerator() {
  const [meetupId, setMeetupId] = useState<number | undefined>(undefined);
  const [preferences, setPreferences] = useState("");
  const [schedules, setSchedules] = useState<GeneratedSchedule[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const { data: meetups } = trpc.meetup.list.useQuery();
  const generate = trpc.aiSchedule.generate.useMutation();
  const bulkSave = trpc.aiSchedule.bulkSave.useMutation();

  async function handleGenerate() {
    if (!meetupId) { toast.error("밋업을 선택해주세요"); return; }
    const result = await generate.mutateAsync({ meetupId, preferences: preferences || undefined });
    if (result.success && result.data?.schedules) {
      setSchedules(result.data.schedules);
      toast.success(`${result.data.schedules.length}개의 일정이 생성되었습니다`);
    } else {
      toast.error(result.error || "스케줄 생성 실패");
    }
  }

  async function handleSave() {
    if (!meetupId || schedules.length === 0) return;
    const result = await bulkSave.mutateAsync({
      meetupId,
      schedules: schedules.map(s => ({
        title: s.title,
        location: s.location || undefined,
        eventTime: s.eventTime,
        endTime: s.endTime || undefined,
        description: s.description || undefined,
        eventOrder: s.eventOrder,
      })),
    });
    if (result.success) {
      toast.success(`${result.count}개의 일정이 저장되었습니다`);
      setSchedules([]);
    }
  }

  function removeSchedule(idx: number) {
    setSchedules(prev => prev.filter((_, i) => i !== idx));
  }

  function updateSchedule(idx: number, data: Partial<GeneratedSchedule>) {
    setSchedules(prev => prev.map((s, i) => i === idx ? { ...s, ...data } : s));
  }

  function formatTime(iso: string) {
    try { return new Date(iso).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  }

  const selectedMeetup = meetups?.find((m: any) => m.id === meetupId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarPlus className="h-6 w-6 text-emerald-500" />
          AI 스케줄 자동 생성
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          밋업 정보를 기반으로 AI가 최적의 일정표를 자동으로 생성합니다
        </p>
      </div>

      {/* Step 1: Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            밋업 선택 및 선호 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>밋업 선택</Label>
            <Select value={String(meetupId || "")} onValueChange={v => setMeetupId(v ? Number(v) : undefined)}>
              <SelectTrigger><SelectValue placeholder="밋업을 선택하세요" /></SelectTrigger>
              <SelectContent>
                {meetups?.map((m: any) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedMeetup && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <p><strong>장소:</strong> {selectedMeetup.location || "미정"}</p>
              <p><strong>기간:</strong> {selectedMeetup.scheduleStart ? new Date(selectedMeetup.scheduleStart).toLocaleDateString("ko-KR") : "미정"} ~ {selectedMeetup.scheduleEnd ? new Date(selectedMeetup.scheduleEnd).toLocaleDateString("ko-KR") : "미정"}</p>
              <p><strong>유형:</strong> {selectedMeetup.type}</p>
            </div>
          )}
          <div>
            <Label>선호 사항 (선택)</Label>
            <Textarea
              value={preferences}
              onChange={e => setPreferences(e.target.value)}
              rows={3}
              placeholder="예: 오전에 네트워킹 세션, 오후에 관광, 저녁에 만찬. VIP 별도 일정 포함."
            />
          </div>
          <Button onClick={handleGenerate} disabled={!meetupId || generate.isPending} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600">
            {generate.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> AI 생성 중...</> : <><Wand2 className="h-4 w-4 mr-1" /> 스케줄 자동 생성</>}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Review */}
      {schedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                생성된 스케줄 ({schedules.length}개)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generate.isPending}>
                  <Wand2 className="h-3.5 w-3.5 mr-1" /> 다시 생성
                </Button>
                <Button size="sm" onClick={handleSave} disabled={bulkSave.isPending}>
                  {bulkSave.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  전체 저장
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-400" />
              <div className="space-y-4">
                {schedules.map((s, idx) => (
                  <div key={idx} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        {editIdx === idx ? (
                          <div className="space-y-3">
                            <Input value={s.title} onChange={e => updateSchedule(idx, { title: e.target.value })} placeholder="일정 제목" />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">시작</Label>
                                <Input type="datetime-local" value={s.eventTime?.slice(0, 16)} onChange={e => updateSchedule(idx, { eventTime: e.target.value })} />
                              </div>
                              <div>
                                <Label className="text-xs">종료</Label>
                                <Input type="datetime-local" value={s.endTime?.slice(0, 16)} onChange={e => updateSchedule(idx, { endTime: e.target.value })} />
                              </div>
                            </div>
                            <Input value={s.location || ""} onChange={e => updateSchedule(idx, { location: e.target.value })} placeholder="장소" />
                            <Textarea value={s.description || ""} onChange={e => updateSchedule(idx, { description: e.target.value })} rows={2} placeholder="설명" />
                            <Button size="sm" onClick={() => setEditIdx(null)}>확인</Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-sm">{s.title}</h3>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(s.eventTime)} {s.endTime && `~ ${formatTime(s.endTime)}`}
                                  </span>
                                  {s.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {s.location}
                                    </span>
                                  )}
                                </div>
                                {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => setEditIdx(idx)}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeSchedule(idx)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
