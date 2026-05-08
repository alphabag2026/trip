import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Plane, Loader2, Users, CheckCircle2, XCircle, Trash2, Edit,
  Upload, FileImage, AlertCircle, UserPlus, FileText,
} from "lucide-react";
import { toast } from "sonner";

interface OcrResult {
  imageUrl: string | null;
  ocrData: any;
  success: boolean;
  error?: string;
}

interface ParsedParticipant {
  name: string;
  passportNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  expiryDate?: string;
  gender?: "M" | "F";
  issuingCountry?: string;
  passportImageUrl?: string;
  pnr?: string;
  ticketNumber?: string;
  airline?: string;
  flightNo?: string;
  departure?: string;
  arrival?: string;
  departureDate?: string;
  departureTime?: string;
  selected?: boolean;
}

export default function PassportFlightUpload() {
  const [meetupId, setMeetupId] = useState<number | undefined>(undefined);
  const [files, setFiles] = useState<File[]>([]);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [participants, setParticipants] = useState<ParsedParticipant[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const { data: meetups } = trpc.meetup.list.useQuery();
  const ocrMutation = trpc.aiBulk.passportFlightOcr.useMutation();
  const registerMutation = trpc.aiBulk.passportFlightRegister.useMutation();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(f => f.type.startsWith("image/"));
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  async function handleOcr() {
    if (files.length === 0) { toast.error("이미지를 업로드해주세요"); return; }
    setIsProcessing(true);
    setProgress(0);

    try {
      // Convert files to base64 in batches of 3
      const allResults: OcrResult[] = [];
      const batchSize = 3;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const images = await Promise.all(batch.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
          const base64 = btoa(binary);
          return { base64, mimeType: file.type, type: "auto" as const };
        }));
        const result = await ocrMutation.mutateAsync({ images, meetupId });
        allResults.push(...result.results);
        setProgress(Math.round(((i + batch.length) / files.length) * 100));
      }

      setOcrResults(allResults);

      // Parse OCR results into participants
      const parsed: ParsedParticipant[] = [];
      for (const r of allResults) {
        if (!r.success || !r.ocrData) continue;
        const data = r.ocrData;
        if (data.docType === "passport") {
          parsed.push({
            name: data.fullName || "",
            passportNumber: data.passportNumber,
            nationality: data.nationality,
            dateOfBirth: data.dateOfBirth,
            expiryDate: data.expiryDate,
            gender: data.gender as "M" | "F" | undefined,
            issuingCountry: data.issuingCountry,
            passportImageUrl: r.imageUrl || undefined,
            selected: true,
          });
        } else if (data.docType === "flight" && data.passengers) {
          for (const p of data.passengers) {
            // Check if this passenger already exists (from passport)
            const existing = parsed.find(ep => 
              ep.name && p.name && 
              ep.name.replace(/\s+/g, "").toUpperCase() === p.name.replace(/\s+/g, "").toUpperCase()
            );
            if (existing) {
              // Merge flight info into existing passport entry
              existing.pnr = p.pnr;
              existing.ticketNumber = p.ticketNumber;
              existing.airline = p.airline;
              existing.flightNo = p.flightNo;
              existing.departure = p.departure;
              existing.arrival = p.arrival;
              existing.departureDate = p.departureDate;
              existing.departureTime = p.departureTime;
            } else {
              parsed.push({
                name: p.name || "",
                pnr: p.pnr,
                ticketNumber: p.ticketNumber,
                airline: p.airline,
                flightNo: p.flightNo,
                departure: p.departure,
                arrival: p.arrival,
                departureDate: p.departureDate,
                departureTime: p.departureTime,
                selected: true,
              });
            }
          }
        }
      }

      setParticipants(parsed);
      setStep(2);
      toast.success(`${allResults.filter(r => r.success).length}개 이미지 OCR 완료, ${parsed.length}명 인식`);
    } catch (e: any) {
      toast.error(e?.message || "OCR 처리 중 오류 발생");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRegister() {
    if (!meetupId) { toast.error("밋업을 선택해주세요"); return; }
    const selected = participants.filter(p => p.selected !== false);
    if (selected.length === 0) { toast.error("등록할 참가자를 선택해주세요"); return; }

    try {
      const result = await registerMutation.mutateAsync({
        meetupId,
        participants: selected.map(p => ({
          name: p.name,
          passportNumber: p.passportNumber,
          nationality: p.nationality,
          dateOfBirth: p.dateOfBirth,
          expiryDate: p.expiryDate,
          gender: p.gender,
          issuingCountry: p.issuingCountry,
          passportImageUrl: p.passportImageUrl,
          pnr: p.pnr,
          ticketNumber: p.ticketNumber,
          airline: p.airline,
          flightNo: p.flightNo,
          departure: p.departure,
          arrival: p.arrival,
          departureDate: p.departureDate,
          departureTime: p.departureTime,
        })),
      });
      if (result.success) {
        toast.success(`${result.count}명이 성공적으로 등록되었습니다`);
        setStep(3);
      }
    } catch (e: any) {
      toast.error(e?.message || "등록 중 오류 발생");
    }
  }

  function toggleSelect(idx: number) {
    setParticipants(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  }

  function removeParticipant(idx: number) {
    setParticipants(prev => prev.filter((_, i) => i !== idx));
  }

  function updateParticipant(idx: number, data: Partial<ParsedParticipant>) {
    setParticipants(prev => prev.map((p, i) => i === idx ? { ...p, ...data } : p));
  }

  const selectedCount = participants.filter(p => p.selected !== false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-500" />
          여권 + 항공권 일괄 등록
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          여권 사진과 항공권 예약 이미지를 업로드하면 AI가 자동으로 파싱하여 참석자를 일괄 등록합니다.
          비회원 참석자가 나중에 회원가입하면 기존 정보가 자동으로 연결됩니다.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        <Badge variant={step >= 1 ? "default" : "outline"} className="gap-1">
          <Upload className="h-3 w-3" /> 1. 업로드
        </Badge>
        <span className="text-muted-foreground">→</span>
        <Badge variant={step >= 2 ? "default" : "outline"} className="gap-1">
          <Users className="h-3 w-3" /> 2. 확인/수정
        </Badge>
        <span className="text-muted-foreground">→</span>
        <Badge variant={step >= 3 ? "default" : "outline"} className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> 3. 완료
        </Badge>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              이미지 업로드 (여권 + 항공권 예약 화면)
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

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">여권 사진 또는 항공권 예약 스크린샷을 드래그하거나 클릭하여 업로드</p>
              <p className="text-xs text-muted-foreground mt-1">여러 장을 한번에 업로드할 수 있습니다 (JPG, PNG)</p>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">{files.length}개 파일 선택됨</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {files.map((f, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border">
                      <img
                        src={URL.createObjectURL(f)}
                        alt={f.name}
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); removeFile(idx); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-[10px] p-1 truncate">{f.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                  AI OCR 처리 중... {progress}%
                </p>
              </div>
            )}

            <Button
              onClick={handleOcr}
              disabled={files.length === 0 || isProcessing || !meetupId}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> OCR 처리 중...</>
              ) : (
                <><FileImage className="h-4 w-4 mr-1" /> {files.length}개 이미지 AI 분석 시작</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review & Edit */}
      {step === 2 && participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                OCR 결과 확인 ({selectedCount}/{participants.length}명 선택)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setStep(1); setParticipants([]); }}>
                  다시 업로드
                </Button>
                <Button size="sm" onClick={handleRegister} disabled={!meetupId || selectedCount === 0 || registerMutation.isPending}>
                  {registerMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                  {selectedCount}명 일괄 등록
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {participants.map((p, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${p.selected !== false ? "bg-background" : "bg-muted/30 opacity-60"}`}>
                  <input type="checkbox" checked={p.selected !== false} onChange={() => toggleSelect(idx)} className="rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{p.name}</span>
                      {p.passportNumber && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <FileText className="h-2.5 w-2.5" /> {p.passportNumber}
                        </Badge>
                      )}
                      {p.nationality && <Badge variant="secondary" className="text-[10px]">{p.nationality}</Badge>}
                      {p.pnr && (
                        <Badge variant="outline" className="text-[10px] gap-0.5 text-blue-600">
                          <Plane className="h-2.5 w-2.5" /> PNR: {p.pnr}
                        </Badge>
                      )}
                      {p.ticketNumber && (
                        <Badge variant="outline" className="text-[10px]">티켓: {p.ticketNumber}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {p.dateOfBirth && <span className="text-[10px] text-muted-foreground">생년월일: {p.dateOfBirth}</span>}
                      {p.expiryDate && <span className="text-[10px] text-muted-foreground">만료: {p.expiryDate}</span>}
                      {p.flightNo && <span className="text-[10px] text-blue-500">편명: {p.flightNo}</span>}
                      {p.departure && p.arrival && <span className="text-[10px] text-muted-foreground">{p.departure} → {p.arrival}</span>}
                      {p.departureDate && <span className="text-[10px] text-muted-foreground">{p.departureDate} {p.departureTime || ""}</span>}
                    </div>
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

      {/* Step 3: Complete */}
      {step === 3 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">등록 완료!</h2>
            <p className="text-muted-foreground mb-4">
              {selectedCount}명의 참석자가 성공적으로 등록되었습니다.
              <br />
              비회원 참석자가 나중에 회원가입하면 기존 정보가 자동으로 연결됩니다.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => { setStep(1); setFiles([]); setParticipants([]); setOcrResults([]); }}>
                추가 등록하기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editIdx !== null && participants[editIdx] && (
        <Dialog open={true} onOpenChange={() => setEditIdx(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>참가자 정보 수정</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>이름 (영문)</Label><Input value={participants[editIdx].name} onChange={e => updateParticipant(editIdx, { name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>여권번호</Label><Input value={participants[editIdx].passportNumber || ""} onChange={e => updateParticipant(editIdx, { passportNumber: e.target.value })} /></div>
                <div><Label>국적</Label><Input value={participants[editIdx].nationality || ""} onChange={e => updateParticipant(editIdx, { nationality: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>생년월일</Label><Input type="date" value={participants[editIdx].dateOfBirth || ""} onChange={e => updateParticipant(editIdx, { dateOfBirth: e.target.value })} /></div>
                <div><Label>만료일</Label><Input type="date" value={participants[editIdx].expiryDate || ""} onChange={e => updateParticipant(editIdx, { expiryDate: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>성별</Label>
                  <Select value={participants[editIdx].gender || ""} onValueChange={v => updateParticipant(editIdx, { gender: v as "M" | "F" })}>
                    <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">남성</SelectItem>
                      <SelectItem value="F">여성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>발급국</Label><Input value={participants[editIdx].issuingCountry || ""} onChange={e => updateParticipant(editIdx, { issuingCountry: e.target.value })} /></div>
              </div>
              <hr className="my-2" />
              <p className="text-sm font-medium flex items-center gap-1"><Plane className="h-3.5 w-3.5" /> 항공 정보</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>PNR</Label><Input value={participants[editIdx].pnr || ""} onChange={e => updateParticipant(editIdx, { pnr: e.target.value })} /></div>
                <div><Label>전자항공권번호</Label><Input value={participants[editIdx].ticketNumber || ""} onChange={e => updateParticipant(editIdx, { ticketNumber: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>항공사</Label><Input value={participants[editIdx].airline || ""} onChange={e => updateParticipant(editIdx, { airline: e.target.value })} /></div>
                <div><Label>편명</Label><Input value={participants[editIdx].flightNo || ""} onChange={e => updateParticipant(editIdx, { flightNo: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>출발지</Label><Input value={participants[editIdx].departure || ""} onChange={e => updateParticipant(editIdx, { departure: e.target.value })} /></div>
                <div><Label>도착지</Label><Input value={participants[editIdx].arrival || ""} onChange={e => updateParticipant(editIdx, { arrival: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>출발일</Label><Input type="date" value={participants[editIdx].departureDate || ""} onChange={e => updateParticipant(editIdx, { departureDate: e.target.value })} /></div>
                <div><Label>출발시간</Label><Input type="time" value={participants[editIdx].departureTime || ""} onChange={e => updateParticipant(editIdx, { departureTime: e.target.value })} /></div>
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
