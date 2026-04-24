import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Loader2, Users, CheckCircle2, XCircle, Trash2, Edit,
  Upload, Wand2, UserPlus, FileText, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ParsedParticipant {
  name: string;
  phone: string;
  messengerId: string;
  locationType: "domestic" | "overseas";
  category: "meetup" | "pre_visit" | "event" | "meeting" | "other";
  teamName: string;
  referrerName: string;
  notes: string;
  selected?: boolean;
}

export default function AdminAiBulkRegister() {
  const [inputText, setInputText] = useState("");
  const [meetupId, setMeetupId] = useState<number | undefined>(undefined);
  const [parsedData, setParsedData] = useState<ParsedParticipant[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const { data: meetups } = trpc.meetup.list.useQuery();
  const parseRegistrations = trpc.aiBulk.parseRegistrations.useMutation();
  const bulkCreate = trpc.aiBulk.bulkCreate.useMutation();

  async function handleParse() {
    if (!inputText.trim()) { toast.error("텍스트를 입력해주세요"); return; }
    const result = await parseRegistrations.mutateAsync({ text: inputText, meetupId });
    if (result.success && result.data?.participants) {
      setParsedData(result.data.participants.map((p: any) => ({ ...p, selected: true })));
      toast.success(`${result.data.participants.length}명의 참가자가 파싱되었습니다`);
    } else {
      toast.error(result.error || "파싱 실패");
    }
  }

  async function handleBulkCreate() {
    if (!meetupId) { toast.error("밋업을 선택해주세요"); return; }
    const selected = parsedData.filter(p => p.selected !== false);
    if (selected.length === 0) { toast.error("등록할 참가자를 선택해주세요"); return; }
    const result = await bulkCreate.mutateAsync({
      meetupId,
      participants: selected.map(p => ({
        name: p.name,
        phone: p.phone || undefined,
        messengerId: p.messengerId || undefined,
        locationType: p.locationType || "domestic",
        category: p.category || "meetup",
        teamName: p.teamName || undefined,
        referrerName: p.referrerName || undefined,
        notes: p.notes || undefined,
      })),
    });
    if (result.success) {
      toast.success(`${result.count}명이 일괄 등록되었습니다`);
      setParsedData([]);
      setInputText("");
    }
  }

  function toggleSelect(idx: number) {
    setParsedData(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  }

  function removeParticipant(idx: number) {
    setParsedData(prev => prev.filter((_, i) => i !== idx));
  }

  function updateParticipant(idx: number, data: Partial<ParsedParticipant>) {
    setParsedData(prev => prev.map((p, i) => i === idx ? { ...p, ...data } : p));
  }

  const selectedCount = parsedData.filter(p => p.selected !== false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-violet-500" />
          AI 일괄 등록
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          텍스트를 붙여넣으면 AI가 참가자 정보를 자동으로 파싱하여 일괄 등록합니다
        </p>
      </div>

      {/* Step 1: Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            1단계: 참가자 정보 입력
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
          <div>
            <Label>참가자 정보 (자유 형식)</Label>
            <Textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              rows={8}
              placeholder={`예시:
김철수 010-1234-5678 텔레그램 @chulsoo 해외 밋업 A팀
박영희 010-9876-5432 카카오 younghee 국내 이벤트
이민수 +81-90-1234-5678 해외 사전방문 B팀 소개자: 김철수

엑셀에서 복사한 데이터, 명단 텍스트, 메신저 대화 등 자유롭게 붙여넣으세요.`}
              className="font-mono text-sm"
            />
          </div>
          <Button onClick={handleParse} disabled={!inputText.trim() || parseRegistrations.isPending} className="w-full bg-gradient-to-r from-violet-500 to-purple-600">
            {parseRegistrations.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> AI 파싱 중...</> : <><Sparkles className="h-4 w-4 mr-1" /> AI로 파싱하기</>}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Review */}
      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                2단계: 파싱 결과 확인 ({selectedCount}/{parsedData.length}명 선택)
              </span>
              <Button size="sm" onClick={handleBulkCreate} disabled={!meetupId || selectedCount === 0 || bulkCreate.isPending}>
                {bulkCreate.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                {selectedCount}명 일괄 등록
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {parsedData.map((p, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${p.selected !== false ? "bg-background" : "bg-muted/30 opacity-60"}`}>
                  <input type="checkbox" checked={p.selected !== false} onChange={() => toggleSelect(idx)} className="rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{p.name}</span>
                      {p.phone && <span className="text-xs text-muted-foreground">{p.phone}</span>}
                      {p.messengerId && <span className="text-xs text-blue-500">@{p.messengerId}</span>}
                      <Badge variant="outline" className="text-[10px]">{p.locationType === "overseas" ? "해외" : "국내"}</Badge>
                      <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                      {p.teamName && <Badge variant="secondary" className="text-[10px]">{p.teamName}</Badge>}
                    </div>
                    {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditIdx(idx)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeParticipant(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editIdx !== null && parsedData[editIdx] && (
        <Dialog open={true} onOpenChange={() => setEditIdx(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>참가자 정보 수정</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>이름</Label><Input value={parsedData[editIdx].name} onChange={e => updateParticipant(editIdx, { name: e.target.value })} /></div>
              <div><Label>전화번호</Label><Input value={parsedData[editIdx].phone} onChange={e => updateParticipant(editIdx, { phone: e.target.value })} /></div>
              <div><Label>메신저 ID</Label><Input value={parsedData[editIdx].messengerId} onChange={e => updateParticipant(editIdx, { messengerId: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>지역</Label>
                  <Select value={parsedData[editIdx].locationType} onValueChange={v => updateParticipant(editIdx, { locationType: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="domestic">국내</SelectItem>
                      <SelectItem value="overseas">해외</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>카테고리</Label>
                  <Select value={parsedData[editIdx].category} onValueChange={v => updateParticipant(editIdx, { category: v as any })}>
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
              </div>
              <div><Label>팀명</Label><Input value={parsedData[editIdx].teamName} onChange={e => updateParticipant(editIdx, { teamName: e.target.value })} /></div>
              <div><Label>소개자</Label><Input value={parsedData[editIdx].referrerName} onChange={e => updateParticipant(editIdx, { referrerName: e.target.value })} /></div>
              <div><Label>메모</Label><Input value={parsedData[editIdx].notes} onChange={e => updateParticipant(editIdx, { notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => setEditIdx(null)}>확인</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
