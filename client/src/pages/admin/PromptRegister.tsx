import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Loader2, Users, CheckCircle2, Trash2, Edit,
  Wand2, UserPlus, FileText, Plane, BookOpen, Upload,
  Image as ImageIcon, FolderOpen, X, RotateCcw, Download,
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
    seatNumber?: string;
    baggageAllowance?: string;
    cabinClass?: string;
  };
  selected?: boolean;
  passportImageUrl?: string;
}

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "compressing" | "uploading" | "analyzing" | "done" | "error";
  progress: number;
  error?: string;
  result?: any;
}

export default function AdminPromptRegister() {
  const [inputText, setInputText] = useState("");
  const [meetupId, setMeetupId] = useState<number | undefined>(undefined);
  const [parsedData, setParsedData] = useState<ParsedParticipant[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("text");

  // Image upload state
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [autoCompress, setAutoCompress] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const { data: meetups } = trpc.meetup.list.useQuery();
  const promptRegister = trpc.aiBulk.promptRegister.useMutation();
  const promptBulkCreate = trpc.aiBulk.promptBulkCreate.useMutation();
  const passportOcr = trpc.aiBulk.passportFlightOcr.useMutation();

  // ── Text Prompt Functions ──
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

  // ── Image Upload Functions ──
  function compressImage(file: File, maxWidth = 2048): Promise<File> {
    return new Promise((resolve) => {
      if (file.size < 4 * 1024 * 1024) { resolve(file); return; }
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new window.Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file);
        }, "image/jpeg", 0.85);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  function handleFilesSelected(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) { toast.error("이미지 파일만 업로드 가능합니다"); return; }
    const newFiles: UploadFile[] = imageFiles.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      preview: URL.createObjectURL(f),
      status: "pending" as const,
      progress: 0,
    }));
    setUploadFiles(prev => [...prev, ...newFiles]);
    toast.success(`${imageFiles.length}개 이미지 추가됨`);
  }

  function removeFile(id: string) {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  }

  function updateFileStatus(id: string, update: Partial<UploadFile>) {
    setUploadFiles(prev => prev.map(f => f.id === id ? { ...f, ...update } : f));
  }

  async function processImages() {
    if (!meetupId) { toast.error("밋업을 선택해주세요"); return; }
    const pending = uploadFiles.filter(f => f.status === "pending" || f.status === "error");
    if (pending.length === 0) { toast.error("처리할 이미지가 없습니다"); return; }
    setIsProcessing(true);

    const BATCH_SIZE = 5;
    const results: ParsedParticipant[] = [];

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (uf) => {
        try {
          // Compress
          updateFileStatus(uf.id, { status: "compressing", progress: 20 });
          const compressed = autoCompress ? await compressImage(uf.file) : uf.file;

          // Convert to base64
          updateFileStatus(uf.id, { status: "uploading", progress: 40 });
          const buffer = await compressed.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
          const base64 = btoa(binary);

          // OCR
          updateFileStatus(uf.id, { status: "analyzing", progress: 60 });
          const ocrResult = await passportOcr.mutateAsync({
            images: [{ base64, mimeType: compressed.type || "image/jpeg", type: "auto" as const }],
          });

          updateFileStatus(uf.id, { status: "done", progress: 100, result: ocrResult });

          const firstResult = ocrResult.results?.[0] as any;
          if (firstResult?.success && firstResult?.ocrData) {
            const d = firstResult.ocrData;
            if (d.docType === "passport") {
              results.push({
                name: d.fullName || "Unknown",
                locationType: "overseas",
                category: "meetup",
                selected: true,
                passportImageUrl: firstResult.imageUrl,
                passport: {
                  passportNumber: d.passportNumber,
                  nationality: d.nationality,
                  dateOfBirth: d.dateOfBirth,
                  expiryDate: d.expiryDate,
                  gender: d.gender as "M" | "F",
                  issuingCountry: d.issuingCountry,
                },
              });
            } else if (d.docType === "flight" && d.passengers) {
              for (const pax of d.passengers) {
                results.push({
                  name: pax.name || "Unknown",
                  locationType: "overseas",
                  category: "meetup",
                  selected: true,
                  flight: {
                    airline: pax.airline,
                    flightNo: pax.flightNo,
                    pnr: pax.pnr,
                    departureCode: pax.departure,
                    arrivalCode: pax.arrival,
                    departureDate: pax.departureDate,
                    departureTime: pax.departureTime,
                    seatNumber: pax.seatNumber,
                    baggageAllowance: pax.baggageAllowance,
                    cabinClass: pax.cabinClass,
                  },
                });
              }
            } else {
              // Fallback: treat as passport-like
              results.push({
                name: d.fullName || d.name || "Unknown",
                locationType: "overseas",
                category: "meetup",
                selected: true,
                passport: d.passportNumber ? {
                  passportNumber: d.passportNumber,
                  nationality: d.nationality,
                  dateOfBirth: d.dateOfBirth,
                  expiryDate: d.expiryDate,
                  gender: d.gender as "M" | "F",
                  issuingCountry: d.issuingCountry,
                } : undefined,
              });
            }
          }
        } catch (err: any) {
          updateFileStatus(uf.id, { status: "error", progress: 0, error: err.message || "OCR 실패" });
        }
      }));
    }

    // Merge results with existing parsedData
    if (results.length > 0) {
      // Merge duplicates by passport number
      const merged = [...parsedData];
      for (const r of results) {
        const existingIdx = merged.findIndex(m =>
          m.passport?.passportNumber && r.passport?.passportNumber &&
          m.passport.passportNumber === r.passport.passportNumber
        );
        if (existingIdx >= 0) {
          // Merge flight info into existing
          if (r.flight && !merged[existingIdx].flight?.flightNo) {
            merged[existingIdx] = { ...merged[existingIdx], flight: r.flight };
          }
        } else {
          merged.push(r);
        }
      }
      setParsedData(merged);
      toast.success(`${results.length}개 이미지에서 정보 추출 완료 (총 ${merged.length}명)`);
    }

    setIsProcessing(false);
  }

  // ── Common Functions ──
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
      setUploadFiles([]);
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
  const processedCount = uploadFiles.filter(f => f.status === "done").length;
  const errorCount = uploadFiles.filter(f => f.status === "error").length;
  const totalProgress = uploadFiles.length > 0
    ? Math.round(uploadFiles.reduce((sum, f) => sum + f.progress, 0) / uploadFiles.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-500" />
          프롬프트 등록 (Alphatrip)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          텍스트를 입력하거나 이미지를 업로드하면 AI가 참가자, 항공편, 여권 정보를 자동 파싱하여 일괄 등록합니다
        </p>
      </div>

      {/* Step 1: Input with Tabs */}
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text" className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> 텍스트 입력
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" /> 이미지 업로드
              </TabsTrigger>
            </TabsList>

            {/* Text Tab */}
            <TabsContent value="text" className="space-y-4">
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
            </TabsContent>

            {/* Image Upload Tab */}
            <TabsContent value="image" className="space-y-4">
              {/* Auto compress toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">이미지 자동 압축</p>
                    <p className="text-xs text-muted-foreground">대용량 이미지를 2048px로 리사이즈하여 업로드 속도 향상</p>
                  </div>
                </div>
                <Switch checked={autoCompress} onCheckedChange={setAutoCompress} />
              </div>

              {/* Drop zone */}
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFilesSelected(e.dataTransfer.files); }}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">여권 사진 또는 항공권 예약 스크린샷을 드래그하거나 클릭하여 업로드</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>50장 이상</strong> 한번에 업로드 가능 (JPG, PNG, WEBP, HEIC)
                </p>
                <p className="text-xs text-muted-foreground">5장씩 배치 처리 | 중복 여권번호 자동 병합 | 자동 압축 {autoCompress ? "ON" : "OFF"}</p>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleFilesSelected(e.target.files)} />
              <input ref={folderInputRef} type="file" accept="image/*" multiple className="hidden" {...{ webkitdirectory: "", directory: "" } as any} onChange={e => e.target.files && handleFilesSelected(e.target.files)} />

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 mr-2" /> 파일 추가 선택
                </Button>
                <Button variant="outline" onClick={() => folderInputRef.current?.click()}>
                  <FolderOpen className="h-4 w-4 mr-2" /> 폴더 전체 선택
                </Button>
              </div>

              {/* Upload file list */}
              {uploadFiles.length > 0 && (
                <div className="space-y-3">
                  {/* Progress summary */}
                  {isProcessing && (
                    <div className="p-3 rounded-lg bg-blue-50/10 border border-blue-500/20">
                      <div className="flex justify-between text-xs mb-1">
                        <span>전체 진행률</span>
                        <span>{processedCount}/{uploadFiles.length} 완료 {errorCount > 0 && `(${errorCount} 실패)`}</span>
                      </div>
                      <Progress value={totalProgress} className="h-2" />
                    </div>
                  )}

                  {/* Thumbnails grid */}
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[300px] overflow-y-auto p-1">
                    {uploadFiles.map(uf => (
                      <div key={uf.id} className="relative group">
                        <img src={uf.preview} alt="" className={`w-full aspect-square object-cover rounded-md border ${
                          uf.status === "done" ? "border-green-500" :
                          uf.status === "error" ? "border-red-500" :
                          uf.status === "pending" ? "border-border" : "border-blue-500"
                        }`} />
                        {uf.status === "done" && <CheckCircle2 className="absolute top-0.5 right-0.5 h-3.5 w-3.5 text-green-500 bg-white rounded-full" />}
                        {uf.status === "error" && <X className="absolute top-0.5 right-0.5 h-3.5 w-3.5 text-red-500 bg-white rounded-full" />}
                        {(uf.status === "compressing" || uf.status === "uploading" || uf.status === "analyzing") && (
                          <Loader2 className="absolute top-0.5 right-0.5 h-3.5 w-3.5 text-blue-500 animate-spin bg-white rounded-full" />
                        )}
                        <button
                          className="absolute top-0 left-0 h-4 w-4 bg-red-500 text-white rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          onClick={() => removeFile(uf.id)}
                        >×</button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{uploadFiles.length}개 이미지 | {processedCount} 완료 | {errorCount} 실패</span>
                    {errorCount > 0 && (
                      <Button size="sm" variant="outline" onClick={processImages} className="text-xs h-7">
                        <RotateCcw className="h-3 w-3 mr-1" /> 실패 재시도
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={processImages}
                disabled={uploadFiles.filter(f => f.status === "pending" || f.status === "error").length === 0 || !meetupId || isProcessing}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600"
              >
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> AI 분석 중... ({processedCount}/{uploadFiles.length})</>
                ) : (
                  <><Wand2 className="h-4 w-4 mr-1" /> {uploadFiles.filter(f => f.status === "pending" || f.status === "error").length}개 이미지 AI 분석 시작</>
                )}
              </Button>
            </TabsContent>
          </Tabs>
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
                      {p.passport?.nationality && <Badge variant="secondary" className="text-[10px]">{p.passport.nationality}</Badge>}
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
                        {p.flight.seatNumber && <span>| 좌석: {p.flight.seatNumber}</span>}
                        {p.flight.baggageAllowance && <span>| 수하물: {p.flight.baggageAllowance}</span>}
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
                  <div><Label className="text-xs">좌석번호</Label><Input value={parsedData[editIdx].flight?.seatNumber || ""} onChange={e => updateParticipant(editIdx, { flight: { ...parsedData[editIdx].flight, seatNumber: e.target.value } })} /></div>
                  <div><Label className="text-xs">수하물</Label><Input value={parsedData[editIdx].flight?.baggageAllowance || ""} onChange={e => updateParticipant(editIdx, { flight: { ...parsedData[editIdx].flight, baggageAllowance: e.target.value } })} /></div>
                  <div><Label className="text-xs">좌석등급</Label><Input value={parsedData[editIdx].flight?.cabinClass || ""} onChange={e => updateParticipant(editIdx, { flight: { ...parsedData[editIdx].flight, cabinClass: e.target.value } })} /></div>
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
