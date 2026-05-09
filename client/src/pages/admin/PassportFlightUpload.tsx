import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Plane, Loader2, Users, CheckCircle2, XCircle, Trash2, Edit,
  Upload, FileImage, AlertCircle, UserPlus, FileText, RotateCcw,
  ImagePlus, FolderOpen, X, Check, Minimize2, Merge,
} from "lucide-react";
import { toast } from "sonner";

interface OcrResult {
  imageUrl: string | null;
  ocrData: any;
  success: boolean;
  error?: string;
}

interface FileWithStatus {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  previewUrl?: string;
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
  merged?: boolean; // 중복 병합된 항목 표시
}

let fileIdCounter = 0;
function generateFileId(): string {
  return `file-${Date.now()}-${++fileIdCounter}`;
}

// ── 이미지 압축 유틸리티 ──────────────────────────────────────────
const MAX_IMAGE_WIDTH = 2048;
const MAX_IMAGE_HEIGHT = 2048;
const COMPRESSION_QUALITY = 0.85;

async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // 리사이즈 필요 여부 확인
      if (width <= MAX_IMAGE_WIDTH && height <= MAX_IMAGE_HEIGHT && file.size <= 4 * 1024 * 1024) {
        // 4MB 이하이고 크기도 적당하면 원본 사용
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(",")[1];
          resolve({ base64, mimeType: file.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      // 비율 유지하면서 리사이즈
      const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, width, height);

      const outputType = "image/jpeg";
      const dataUrl = canvas.toDataURL(outputType, COMPRESSION_QUALITY);
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: outputType });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지 로드 실패"));
    };
    img.src = url;
  });
}

// ── 중복 여권번호 병합 유틸리티 ──────────────────────────────────────────
function mergeParticipantsByPassport(participants: ParsedParticipant[]): ParsedParticipant[] {
  const passportMap = new Map<string, ParsedParticipant>();
  const result: ParsedParticipant[] = [];

  for (const p of participants) {
    const passportKey = p.passportNumber?.trim().toUpperCase();
    if (passportKey && passportMap.has(passportKey)) {
      // 기존 항목에 병합
      const existing = passportMap.get(passportKey)!;
      // 빈 필드만 채우기 (기존 데이터 우선)
      if (!existing.name && p.name) existing.name = p.name;
      if (!existing.nationality && p.nationality) existing.nationality = p.nationality;
      if (!existing.dateOfBirth && p.dateOfBirth) existing.dateOfBirth = p.dateOfBirth;
      if (!existing.expiryDate && p.expiryDate) existing.expiryDate = p.expiryDate;
      if (!existing.gender && p.gender) existing.gender = p.gender;
      if (!existing.issuingCountry && p.issuingCountry) existing.issuingCountry = p.issuingCountry;
      if (!existing.passportImageUrl && p.passportImageUrl) existing.passportImageUrl = p.passportImageUrl;
      // 항공 정보 병합
      if (!existing.pnr && p.pnr) existing.pnr = p.pnr;
      if (!existing.ticketNumber && p.ticketNumber) existing.ticketNumber = p.ticketNumber;
      if (!existing.airline && p.airline) existing.airline = p.airline;
      if (!existing.flightNo && p.flightNo) existing.flightNo = p.flightNo;
      if (!existing.departure && p.departure) existing.departure = p.departure;
      if (!existing.arrival && p.arrival) existing.arrival = p.arrival;
      if (!existing.departureDate && p.departureDate) existing.departureDate = p.departureDate;
      if (!existing.departureTime && p.departureTime) existing.departureTime = p.departureTime;
      existing.merged = true;
    } else if (passportKey) {
      passportMap.set(passportKey, { ...p });
      result.push(passportMap.get(passportKey)!);
    } else {
      // 여권번호 없는 항목은 이름 기반으로 병합 시도
      const nameKey = p.name?.replace(/\s+/g, "").toUpperCase();
      const existingByName = result.find(r => 
        r.name?.replace(/\s+/g, "").toUpperCase() === nameKey && nameKey
      );
      if (existingByName) {
        if (!existingByName.pnr && p.pnr) existingByName.pnr = p.pnr;
        if (!existingByName.ticketNumber && p.ticketNumber) existingByName.ticketNumber = p.ticketNumber;
        if (!existingByName.airline && p.airline) existingByName.airline = p.airline;
        if (!existingByName.flightNo && p.flightNo) existingByName.flightNo = p.flightNo;
        if (!existingByName.departure && p.departure) existingByName.departure = p.departure;
        if (!existingByName.arrival && p.arrival) existingByName.arrival = p.arrival;
        if (!existingByName.departureDate && p.departureDate) existingByName.departureDate = p.departureDate;
        if (!existingByName.departureTime && p.departureTime) existingByName.departureTime = p.departureTime;
        if (!existingByName.passportNumber && p.passportNumber) existingByName.passportNumber = p.passportNumber;
        existingByName.merged = true;
      } else {
        result.push({ ...p });
      }
    }
  }

  return result;
}

export default function PassportFlightUpload() {
  const [meetupId, setMeetupId] = useState<number | undefined>(undefined);
  const [filesWithStatus, setFilesWithStatus] = useState<FileWithStatus[]>([]);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [participants, setParticipants] = useState<ParsedParticipant[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [showAllThumbnails, setShowAllThumbnails] = useState(false);
  const [autoCompress, setAutoCompress] = useState(true);
  const [mergedCount, setMergedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const { data: meetups } = trpc.meetup.list.useQuery();
  const ocrMutation = trpc.aiBulk.passportFlightOcr.useMutation();
  const registerMutation = trpc.aiBulk.passportFlightRegister.useMutation();

  // ── 브라우저 탭 닫기 방지 ──────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing || (filesWithStatus.length > 0 && filesWithStatus.some(f => f.status === "uploading"))) {
        e.preventDefault();
        e.returnValue = "업로드가 진행 중입니다. 페이지를 떠나시겠습니까?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProcessing, filesWithStatus]);

  // Stats
  const totalFiles = filesWithStatus.length;
  const successFiles = filesWithStatus.filter(f => f.status === "success").length;
  const errorFiles = filesWithStatus.filter(f => f.status === "error").length;
  const pendingFiles = filesWithStatus.filter(f => f.status === "pending").length;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    const newFiles: FileWithStatus[] = droppedFiles.map(file => ({
      file,
      id: generateFileId(),
      status: "pending" as const,
      previewUrl: URL.createObjectURL(file),
    }));
    setFilesWithStatus(prev => [...prev, ...newFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(f => f.type.startsWith("image/"));
      const newFiles: FileWithStatus[] = selected.map(file => ({
        file,
        id: generateFileId(),
        status: "pending" as const,
        previewUrl: URL.createObjectURL(file),
      }));
      setFilesWithStatus(prev => [...prev, ...newFiles]);
      e.target.value = "";
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(f => f.type.startsWith("image/"));
      const newFiles: FileWithStatus[] = selected.map(file => ({
        file,
        id: generateFileId(),
        status: "pending" as const,
        previewUrl: URL.createObjectURL(file),
      }));
      setFilesWithStatus(prev => [...prev, ...newFiles]);
      e.target.value = "";
    }
  };

  const removeFile = (id: string) => {
    setFilesWithStatus(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAllFiles = () => {
    filesWithStatus.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
    setFilesWithStatus([]);
  };

  const retryFailed = () => {
    setFilesWithStatus(prev => prev.map(f => f.status === "error" ? { ...f, status: "pending" as const, error: undefined } : f));
  };

  async function handleOcr() {
    if (filesWithStatus.length === 0) { toast.error("이미지를 업로드해주세요"); return; }
    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);

    const pendingFilesList = filesWithStatus.filter(f => f.status === "pending" || f.status === "error");
    if (pendingFilesList.length === 0) {
      toast.info("처리할 파일이 없습니다");
      setIsProcessing(false);
      return;
    }

    try {
      const allResults: OcrResult[] = [...ocrResults];
      const batchSize = 5;
      let processed = 0;

      for (let i = 0; i < pendingFilesList.length; i += batchSize) {
        const batch = pendingFilesList.slice(i, i + batchSize);
        
        const batchIds = batch.map(f => f.id);
        setFilesWithStatus(prev => prev.map(f => 
          batchIds.includes(f.id) ? { ...f, status: "uploading" as const } : f
        ));

        try {
          const images = await Promise.all(batch.map(async (fileItem) => {
            if (autoCompress) {
              // 이미지 압축 사용
              const { base64, mimeType } = await compressImage(fileItem.file);
              return { base64, mimeType, type: "auto" as const };
            } else {
              // 원본 그대로 사용
              const buffer = await fileItem.file.arrayBuffer();
              const bytes = new Uint8Array(buffer);
              let binary = "";
              const chunkSize = 8192;
              for (let j = 0; j < bytes.length; j += chunkSize) {
                const chunk = bytes.slice(j, j + chunkSize);
                for (let k = 0; k < chunk.length; k++) {
                  binary += String.fromCharCode(chunk[k]);
                }
              }
              const base64 = btoa(binary);
              return { base64, mimeType: fileItem.file.type, type: "auto" as const };
            }
          }));

          const result = await ocrMutation.mutateAsync({ images, meetupId });
          
          result.results.forEach((r: OcrResult, idx: number) => {
            const fileId = batch[idx]?.id;
            if (fileId) {
              setFilesWithStatus(prev => prev.map(f => 
                f.id === fileId 
                  ? { ...f, status: r.success ? "success" as const : "error" as const, error: r.error }
                  : f
              ));
            }
          });

          allResults.push(...result.results);
        } catch (e: any) {
          setFilesWithStatus(prev => prev.map(f => 
            batchIds.includes(f.id) ? { ...f, status: "error" as const, error: e?.message || "처리 실패" } : f
          ));
        }

        processed += batch.length;
        setProcessedCount(processed);
        setProgress(Math.round((processed / pendingFilesList.length) * 100));
      }

      setOcrResults(allResults);

      // Parse OCR results into participants
      const rawParsed: ParsedParticipant[] = [];
      for (const r of allResults) {
        if (!r.success || !r.ocrData) continue;
        const data = r.ocrData;
        if (data.docType === "passport") {
          rawParsed.push({
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
            rawParsed.push({
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

      // 중복 여권번호/이름 자동 병합
      const merged = mergeParticipantsByPassport(rawParsed);
      const mergedItems = merged.filter(p => p.merged).length;
      setMergedCount(mergedItems);

      setParticipants(merged);
      if (merged.length > 0) setStep(2);
      const successCount = allResults.filter(r => r.success).length;
      
      let msg = `${successCount}/${allResults.length}개 이미지 OCR 완료, ${merged.length}명 인식`;
      if (mergedItems > 0) {
        msg += ` (${rawParsed.length - merged.length}건 중복 병합)`;
      }
      toast.success(msg);
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

  // Thumbnail display
  const displayFiles = useMemo(() => {
    if (showAllThumbnails || filesWithStatus.length <= 24) return filesWithStatus;
    return filesWithStatus.slice(0, 20);
  }, [filesWithStatus, showAllThumbnails]);

  const hiddenCount = filesWithStatus.length > 24 && !showAllThumbnails ? filesWithStatus.length - 20 : 0;

  // 총 파일 크기 계산
  const totalSizeMB = useMemo(() => {
    return filesWithStatus.reduce((sum, f) => sum + f.file.size, 0) / (1024 * 1024);
  }, [filesWithStatus]);

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
          <strong className="text-foreground"> 50장 이상</strong> 동시 업로드 가능합니다.
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

            {/* 이미지 압축 옵션 */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Minimize2 className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">이미지 자동 압축</p>
                  <p className="text-xs text-muted-foreground">대용량 이미지를 2048px로 리사이즈하여 업로드 속도 향상</p>
                </div>
              </div>
              <Switch checked={autoCompress} onCheckedChange={setAutoCompress} />
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">여권 사진 또는 항공권 예약 스크린샷을 드래그하거나 클릭하여 업로드</p>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>50장 이상</strong> 한번에 업로드 가능 (JPG, PNG, WEBP, HEIC)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                5장씩 배치 처리 | 중복 여권번호 자동 병합 | {autoCompress ? "자동 압축 ON" : "원본 업로드"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Additional upload buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <ImagePlus className="h-4 w-4 mr-1.5" />
                파일 추가 선택
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => folderInputRef.current?.click()}
                className="flex-1"
              >
                <FolderOpen className="h-4 w-4 mr-1.5" />
                폴더 전체 선택
              </Button>
              <input
                ref={folderInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFolderSelect}
                className="hidden"
                {...{ webkitdirectory: "", directory: "" } as any}
              />
            </div>

            {/* File Stats Bar */}
            {totalFiles > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{totalFiles}개 파일</span>
                  <span className="text-muted-foreground text-xs">({totalSizeMB.toFixed(1)}MB)</span>
                  {successFiles > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {successFiles} 완료
                    </span>
                  )}
                  {errorFiles > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="h-3.5 w-3.5" /> {errorFiles} 실패
                    </span>
                  )}
                  {pendingFiles > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <FileImage className="h-3.5 w-3.5" /> {pendingFiles} 대기
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {errorFiles > 0 && (
                    <Button size="sm" variant="outline" onClick={retryFailed} className="h-7 text-xs">
                      <RotateCcw className="h-3 w-3 mr-1" /> 실패 재시도
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={clearAllFiles} className="h-7 text-xs text-red-500 hover:text-red-600">
                    <Trash2 className="h-3 w-3 mr-1" /> 전체 삭제
                  </Button>
                </div>
              </div>
            )}

            {/* File Grid */}
            {totalFiles > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
                  {displayFiles.map((fileItem) => (
                    <div key={fileItem.id} className="relative group rounded-lg overflow-hidden border aspect-square">
                      <img
                        src={fileItem.previewUrl}
                        alt={fileItem.file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {fileItem.status === "uploading" && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        </div>
                      )}
                      {fileItem.status === "success" && (
                        <div className="absolute top-0.5 right-0.5">
                          <div className="bg-green-500 rounded-full p-0.5">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        </div>
                      )}
                      {fileItem.status === "error" && (
                        <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                          <XCircle className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); removeFile(fileItem.id); }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {hiddenCount > 0 && (
                    <div 
                      className="rounded-lg border border-dashed flex items-center justify-center aspect-square cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setShowAllThumbnails(true)}
                    >
                      <div className="text-center">
                        <span className="text-lg font-bold text-muted-foreground">+{hiddenCount}</span>
                        <p className="text-[9px] text-muted-foreground">더 보기</p>
                      </div>
                    </div>
                  )}
                </div>
                {showAllThumbnails && filesWithStatus.length > 24 && (
                  <Button variant="ghost" size="sm" onClick={() => setShowAllThumbnails(false)} className="w-full text-xs">
                    접기
                  </Button>
                )}
              </div>
            )}

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    <Loader2 className="h-3.5 w-3.5 inline animate-spin mr-1.5" />
                    AI OCR 처리 중... (탭을 닫지 마세요)
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {processedCount}/{filesWithStatus.filter(f => f.status !== "success").length}장 ({progress}%)
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                  5장씩 배치 처리 중 | {autoCompress ? "이미지 자동 압축 적용" : "원본 이미지 사용"} | 중복 여권번호 자동 병합
                </p>
              </div>
            )}

            <Button
              onClick={handleOcr}
              disabled={totalFiles === 0 || isProcessing || !meetupId || pendingFiles === 0}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 h-12 text-base"
            >
              {isProcessing ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> OCR 처리 중... ({processedCount}/{pendingFiles})</>
              ) : (
                <><FileImage className="h-5 w-5 mr-2" /> {pendingFiles > 0 ? `${pendingFiles}개` : `${totalFiles}개`} 이미지 AI 분석 시작</>
              )}
            </Button>

            {totalFiles > 30 && !isProcessing && (
              <p className="text-xs text-center text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {totalFiles}장 처리에 약 {Math.ceil(totalFiles / 5) * 10}~{Math.ceil(totalFiles / 5) * 20}초 소요 예상
                {autoCompress && ` (압축으로 ~${Math.round(totalSizeMB * 0.4)}MB 절약)`}
              </p>
            )}
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
                {mergedCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] gap-0.5">
                    <Merge className="h-2.5 w-2.5" /> {mergedCount}건 자동 병합됨
                  </Badge>
                )}
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
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2">
                {participants.map((p, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${p.selected !== false ? "bg-background" : "bg-muted/30 opacity-60"} ${p.merged ? "border-l-2 border-l-blue-500" : ""}`}>
                    <input type="checkbox" checked={p.selected !== false} onChange={() => toggleSelect(idx)} className="rounded" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{p.name}</span>
                        {p.merged && (
                          <Badge variant="secondary" className="text-[9px] gap-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            <Merge className="h-2 w-2" /> 병합
                          </Badge>
                        )}
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
            </ScrollArea>
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
              <Button variant="outline" onClick={() => { setStep(1); setFilesWithStatus([]); setParticipants([]); setOcrResults([]); setProgress(0); setProcessedCount(0); setMergedCount(0); }}>
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
