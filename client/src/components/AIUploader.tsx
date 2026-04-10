import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Sparkles, Camera, FileText, Loader2, X, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

type AIContext = "vehicle" | "accommodation" | "event" | "itinerary" | "channel";

interface AIUploaderProps {
  context: AIContext;
  onExtracted: (data: any, imageUrl?: string) => void;
  className?: string;
  compact?: boolean;
}

export default function AIUploader({ context, onExtracted, className = "", compact = false }: AIUploaderProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"upload" | "prompt">("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [promptText, setPromptText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeImageMut = trpc.aiExtract.analyzeImage.useMutation();
  const analyzePromptMut = trpc.aiExtract.analyzePrompt.useMutation();

  const contextLabels: Record<AIContext, string> = {
    vehicle: t("aiUploader.vehicle", "차량"),
    accommodation: t("aiUploader.accommodation", "숙소"),
    event: t("aiUploader.event", "이벤트"),
    itinerary: t("aiUploader.itinerary", "여정표"),
    channel: t("aiUploader.channel", "소통채널"),
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;
    // 16MB limit
    if (file.size > 16 * 1024 * 1024) {
      toast.error(t("aiUploader.fileTooLarge", "파일 크기가 16MB를 초과합니다"));
      return;
    }

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      const base64 = dataUrl.split(",")[1];
      try {
        const result = await analyzeImageMut.mutateAsync({
          imageBase64: base64,
          mimeType: file.type,
          context,
        });
        if (result.success && result.extracted) {
          onExtracted(result.extracted, result.imageUrl);
          toast.success(t("aiUploader.extractSuccess", "AI가 정보를 추출했습니다. 확인 후 수정해주세요."));
        } else {
          toast.error(t("aiUploader.extractFail", "AI 분석에 실패했습니다. 수동으로 입력해주세요."));
        }
      } catch (e: any) {
        toast.error(e.message || t("aiUploader.error", "오류가 발생했습니다"));
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  }, [context, analyzeImageMut, onExtracted, t]);

  const handlePromptSubmit = useCallback(async () => {
    if (!promptText.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzePromptMut.mutateAsync({
        prompt: promptText,
        context,
      });
      if (result.success && result.extracted) {
        onExtracted(result.extracted);
        toast.success(t("aiUploader.promptSuccess", "AI가 정보를 파싱했습니다. 확인 후 수정해주세요."));
        setPromptText("");
      } else {
        toast.error(t("aiUploader.promptFail", "AI 파싱에 실패했습니다. 다시 시도해주세요."));
      }
    } catch (e: any) {
      toast.error(e.message || t("aiUploader.error", "오류가 발생했습니다"));
    } finally {
      setIsAnalyzing(false);
    }
  }, [promptText, context, analyzePromptMut, onExtracted, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const clearPreview = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex gap-2">
          <Button type="button" variant={mode === "upload" ? "default" : "outline"} size="sm"
            onClick={() => setMode("upload")} className="flex-1">
            <Camera className="h-3.5 w-3.5 mr-1" />
            {t("aiUploader.photoUpload", "사진/PDF")}
          </Button>
          <Button type="button" variant={mode === "prompt" ? "default" : "outline"} size="sm"
            onClick={() => setMode("prompt")} className="flex-1">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            {t("aiUploader.aiPrompt", "AI 프롬프트")}
          </Button>
        </div>

        {mode === "upload" ? (
          <div className="relative">
            {previewUrl && (
              <div className="relative mb-2">
                <img src={previewUrl} alt="preview" className="w-full h-24 object-cover rounded-md border border-border" />
                <button onClick={clearPreview} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            )}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-md p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {isAnalyzing ? (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">{t("aiUploader.analyzing", "AI 분석 중...")}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  <span className="text-xs">{t("aiUploader.dropOrClick", "클릭 또는 드래그하여 업로드")}</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={promptText}
              onChange={e => setPromptText(e.target.value)}
              placeholder={getPlaceholder(context, t)}
              rows={3}
              className="text-sm"
            />
            <Button type="button" size="sm" className="w-full" disabled={!promptText.trim() || isAnalyzing}
              onClick={handlePromptSubmit}>
              {isAnalyzing ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />{t("aiUploader.parsing", "파싱 중...")}</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5 mr-1" />{t("aiUploader.autoFill", "AI 자동 입력")}</>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Full-size version
  return (
    <div className={`rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Sparkles className="h-4 w-4" />
        {t("aiUploader.title", "AI 자동 입력")} - {contextLabels[context]}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant={mode === "upload" ? "default" : "outline"} size="sm"
          onClick={() => setMode("upload")}>
          <Camera className="h-4 w-4 mr-1.5" />
          {t("aiUploader.photoUpload", "사진/PDF 업로드")}
        </Button>
        <Button type="button" variant={mode === "prompt" ? "default" : "outline"} size="sm"
          onClick={() => setMode("prompt")}>
          <Sparkles className="h-4 w-4 mr-1.5" />
          {t("aiUploader.aiPrompt", "AI 프롬프트")}
        </Button>
      </div>

      {mode === "upload" ? (
        <>
          {previewUrl && (
            <div className="relative">
              <img src={previewUrl} alt="preview" className="w-full h-32 object-cover rounded-md border border-border" />
              <button onClick={clearPreview} className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          )}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-2 text-primary">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm font-medium">{t("aiUploader.analyzing", "AI가 분석 중입니다...")}</span>
                <span className="text-xs text-muted-foreground">{t("aiUploader.analyzingDesc", "이미지에서 정보를 추출하고 있습니다")}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="flex gap-3">
                  <ImageIcon className="h-6 w-6" />
                  <FileText className="h-6 w-6" />
                </div>
                <span className="text-sm">{t("aiUploader.dropOrClick", "사진, PDF, 엑셀 스크린샷을 드래그하거나 클릭하여 업로드")}</span>
                <span className="text-xs">{t("aiUploader.supportedFormats", "JPG, PNG, PDF 지원 (최대 16MB)")}</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />
        </>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
            placeholder={getPlaceholder(context, t)}
            rows={4}
            className="text-sm"
          />
          <Button type="button" className="w-full" disabled={!promptText.trim() || isAnalyzing}
            onClick={handlePromptSubmit}>
            {isAnalyzing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("aiUploader.parsing", "AI 파싱 중...")}</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />{t("aiUploader.autoFill", "AI 자동 입력")}</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function getPlaceholder(context: AIContext, t: any): string {
  const placeholders: Record<AIContext, string> = {
    vehicle: t("aiUploader.vehiclePlaceholder", "예: 토요타 알파드 흰색, 차량번호 51가1234, 기사 홍길동 010-1234-5678, 공항 픽업 오전 10시"),
    accommodation: t("aiUploader.accommodationPlaceholder", "예: 롯데호텔 하노이 1205호 트윈룸, 체크인 4/15 14:00, 체크아웃 4/18 12:00"),
    event: t("aiUploader.eventPlaceholder", "예: 4/15 09:00 환영 만찬 롯데호텔 2층 볼룸, 4/16 10:00 비즈니스 미팅 회의실A, 4/16 19:00 저녁식사 레스토랑"),
    itinerary: t("aiUploader.itineraryPlaceholder", "예: 김철수 베트남 여정표, KE461 인천→하노이 4/15 09:00, 롯데호텔 하노이 1205호 4/15-4/18, 귀국편 KE462 하노이→인천 4/18 15:00"),
    channel: t("aiUploader.channelPlaceholder", "예: 두바이 공항 픽업 채널, 기사 홍길동 010-1234-5678, 픽업 기사와 실시간 소통"),
  };
  return placeholders[context];
}
