import { useState } from "react";
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
  Sparkles, Loader2, Users, CheckCircle2, Trash2, Edit,
  Wand2, UserPlus, FileText, Plane, BookOpen,
} from "lucide-react";
import { toast } from "sonner";

interface ParsedParticipant {
  name: string;
  koreanName?: string;
  phone?: string;
  messengerId?: string;
  teamName?: string;
  locationType: "domestic" | "overseas";
  category: "meetup" | "pre_visit" | "event" | "meeting" | "other";
  passport?: {
    passportNumber?: string;
    nationality?: string;
    dateOfBirth?: string;
    expiryDate?: string;
    gender?: "M" | "F";
    issuingCountry?: string;
  };
  flight?: {
    airline?: string;
    flightNo?: string;
    pnr?: string;
    departureAirport?: string;
    departureCode?: string;
    arrivalAirport?: string;
    arrivalCode?: string;
    departureDate?: string;
    departureTime?: string;
    arrivalTime?: string;
    returnFlightNo?: string;
    returnDepartureDate?: string;
    returnDepartureTime?: string;
    returnArrivalTime?: string;
  };
  selected?: boolean;
}

export default function AdminPromptRegister() {
  const [inputText, setInputText] = useState("");
  const [meetupId, setMeetupId] = useState<number | undefined>(undefined);
  const [parsedData, setParsedData] = useState<ParsedParticipant[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const { data: meetups } = trpc.meetup.list.useQuery();
  const promptRegister = trpc.aiBulk.promptRegister.useMutation();
  const promptBulkCreate = trpc.aiBulk.promptBulkCreate.useMutation();

  async function handleParse() {
    if (!inputText.trim()) { toast.error("텍스트를 입력해주세요"); return; }
    if (!meetupId) { toast.error("밋업을 선택해주세요"); return; }
    const result = await promptRegister.mutateAsync({ text: inputText, meetupId });
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
    const result = await promptBulkCreate.mutateAsync({
      meetupId,
      participants: selected.map(p => ({
        name: p.name,
        koreanName: p.koreanName,
        phone: p.phone,
        messengerId: p.messengerId,
        teamName: p.teamName,
        locationType: p.locationType || "overseas",
        category: p.category || "event",
        passport: p.passport,
        flight: p.flight,
      })),
    });
    if (result.success) {
      toast.success(`${result.count}명이 등록되었습니다 (여권+항공 포함)`);
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
          <BookOpen className="h-6 w-6 text-blue-500" />
          프롬프트 등록 (Alphatrip)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          텍스트를 입력하면 AI가 참가자, 항공편, 여권 정보를 자동 파싱하여 일괄 등록합니다
        </p>
      </div>

      {/* Step 1: Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            1단계: 예약 정보 입력
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
            <Label>예약 정보 (프롬프트 형식)</Label>
            <Textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              rows={10}
              placeholder={`예시:
하롱베이 2140 Xplay 행사 박석봉팀 5월 10일부터 5월 13일까지
항공: 아시아나항공 OZ733 ICN→HAN 08:00-10:50
귀국: OZ734 HAN→ICN 12:05-18:35
예약번호: BQ9VVN

참가자:
김철수 M99731754 KOR 1959-02-10 남 만료 2027-06-28
박영희 M28411732 KOR 1946-03-10 남 만료 2028-08-28

또는 자유 형식으로 입력해도 AI가 자동 파싱합니다.`}
              className="font-mono text-sm"
            />
          </div>
          <Button onClick={handleParse} disabled={!inputText.trim() || !meetupId || promptRegister.isPending} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600">
            {promptRegister.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> AI 파싱 중...</> : <><Sparkles className="h-4 w-4 mr-1" /> AI로 파싱하기</>}
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
              <Button size="sm" onClick={handleBulkCreate} disabled={!meetupId || selectedCount === 0 || promptBulkCreate.isPending}>
                {promptBulkCreate.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                {selectedCount}명 일괄 등록
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {parsedData.map((p, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${p.selected !== false ? "bg-background" : "bg-muted/30 opacity-60"}`}>
                  <input type="checkbox" checked={p.selected !== false} onChange={() => toggleSelect(idx)} className="rounded mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{p.name}</span>
                      {p.koreanName && <span className="text-xs text-muted-foreground">({p.koreanName})</span>}
                      <Badge variant="outline" className="text-[10px]">{p.locationType === "overseas" ? "해외" : "국내"}</Badge>
                      {p.teamName && <Badge variant="secondary" className="text-[10px]">{p.teamName}</Badge>}
                    </div>
                    {/* Passport info */}
                    {p.passport?.passportNumber && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>여권: {p.passport.passportNumber}</span>
                        {p.passport.nationality && <span>| {p.passport.nationality}</span>}
                        {p.passport.dateOfBirth && <span>| {p.passport.dateOfBirth}</span>}
                        {p.passport.gender && <span>| {p.passport.gender}</span>}
                        {p.passport.expiryDate && <span>| 만료: {p.passport.expiryDate}</span>}
                      </div>
                    )}
                    {/* Flight info */}
                    {p.flight?.flightNo && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-blue-600">
                        <Plane className="h-3 w-3" />
                        <span>{p.flight.airline} {p.flight.flightNo}</span>
                        {p.flight.departureCode && p.flight.arrivalCode && <span>| {p.flight.departureCode}→{p.flight.arrivalCode}</span>}
                        {p.flight.departureDate && <span>| {p.flight.departureDate}</span>}
                        {p.flight.departureTime && <span>{p.flight.departureTime}</span>}
                        {p.flight.pnr && <span>| PNR: {p.flight.pnr}</span>}
                      </div>
                    )}
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
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>참가자 정보 수정</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>영문 이름</Label><Input value={parsedData[editIdx].name} onChange={e => updateParticipant(editIdx, { name: e.target.value })} /></div>
                <div><Label>한글 이름</Label><Input value={parsedData[editIdx].koreanName || ""} onChange={e => updateParticipant(editIdx, { koreanName: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>전화번호</Label><Input value={parsedData[editIdx].phone || ""} onChange={e => updateParticipant(editIdx, { phone: e.target.value })} /></div>
                <div><Label>팀명</Label><Input value={parsedData[editIdx].teamName || ""} onChange={e => updateParticipant(editIdx, { teamName: e.target.value })} /></div>
              </div>
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
              {/* Passport Section */}
              <div className="border-t pt-3">
                <Label className="font-semibold text-sm">여권 정보</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div><Label className="text-xs">여권번호</Label><Input value={parsedData[editIdx].passport?.passportNumber || ""} onChange={e => updateParticipant(editIdx, { passport: { ...parsedData[editIdx].passport, passportNumber: e.target.value } })} /></div>
                  <div><Label className="text-xs">국적</Label><Input value={parsedData[editIdx].passport?.nationality || ""} onChange={e => updateParticipant(editIdx, { passport: { ...parsedData[editIdx].passport, nationality: e.target.value } })} /></div>
                  <div><Label className="text-xs">생년월일</Label><Input value={parsedData[editIdx].passport?.dateOfBirth || ""} onChange={e => updateParticipant(editIdx, { passport: { ...parsedData[editIdx].passport, dateOfBirth: e.target.value } })} placeholder="YYYY-MM-DD" /></div>
                  <div><Label className="text-xs">만료일</Label><Input value={parsedData[editIdx].passport?.expiryDate || ""} onChange={e => updateParticipant(editIdx, { passport: { ...parsedData[editIdx].passport, expiryDate: e.target.value } })} placeholder="YYYY-MM-DD" /></div>
                  <div>
                    <Label className="text-xs">성별</Label>
                    <Select value={parsedData[editIdx].passport?.gender || ""} onValueChange={v => updateParticipant(editIdx, { passport: { ...parsedData[editIdx].passport, gender: v as any } })}>
                      <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">남</SelectItem>
                        <SelectItem value="F">여</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">발급국</Label><Input value={parsedData[editIdx].passport?.issuingCountry || ""} onChange={e => updateParticipant(editIdx, { passport: { ...parsedData[editIdx].passport, issuingCountry: e.target.value } })} /></div>
                </div>
              </div>
              {/* Flight Section */}
              <div className="border-t pt-3">
                <Label className="font-semibold text-sm">항공편 정보</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div><Label className="text-xs">항공사</Label><Input value={parsedData[editIdx].flight?.airline || ""} onChange={e => updateParticipant(editIdx, { flight: { ...parsedData[editIdx].flight, airline: e.target.value } })} /></div>
                  <div><Label className="text-xs">편명</Label><Input value={parsedData[editIdx].flight?.flightNo || ""} onChange={e => updateParticipant(editIdx, { flight: { ...parsedData[editIdx].flight, flightNo: e.target.value } })} /></div>
                  <div><Label className="text-xs">PNR</Label><Input value={parsedData[editIdx].flight?.pnr || ""} onChange={e => updateParticipant(editIdx, { flight: { ...parsedData[editIdx].flight, pnr: e.target.value } })} /></div>
                  <div><Label className="text-xs">출발일</Label><Input value={parsedData[editIdx].flight?.departureDate || ""} onChange={e => updateParticipant(editIdx, { flight: { ...parsedData[editIdx].flight, departureDate: e.target.value } })} placeholder="YYYY-MM-DD" /></div>
                  <div><Label className="text-xs">출발시간</Label><Input value={parsedData[editIdx].flight?.departureTime || ""} onChange={e => updateParticipant(editIdx, { flight: { ...parsedData[editIdx].flight, departureTime: e.target.value } })} placeholder="HH:mm" /></div>
                  <div><Label className="text-xs">도착시간</Label><Input value={parsedData[editIdx].flight?.arrivalTime || ""} onChange={e => updateParticipant(editIdx, { flight: { ...parsedData[editIdx].flight, arrivalTime: e.target.value } })} placeholder="HH:mm" /></div>
                  <div><Label className="text-xs">출발공항</Label><Input value={parsedData[editIdx].flight?.departureCode || ""} onChange={e => updateParticipant(editIdx, { flight: { ...parsedData[editIdx].flight, departureCode: e.target.value } })} placeholder="ICN" /></div>
                  <div><Label className="text-xs">도착공항</Label><Input value={parsedData[editIdx].flight?.arrivalCode || ""} onChange={e => updateParticipant(editIdx, { flight: { ...parsedData[editIdx].flight, arrivalCode: e.target.value } })} placeholder="HAN" /></div>
                </div>
              </div>
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
