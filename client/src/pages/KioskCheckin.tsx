import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  QrCode, Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle,
  Settings, Maximize, Minimize, Users, Clock, Loader2, RotateCcw
} from "lucide-react";

// ── QR Scanner Hook ──
function useQrScanner(onScan: (data: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const jsQRRef = useRef<any>(null);

  const startScanner = useCallback(async () => {
    try {
      setError(null);
      if (!jsQRRef.current) {
        const mod = await import("jsqr");
        jsQRRef.current = mod.default || mod;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
      const scan = () => {
        if (!videoRef.current || !canvasRef.current || !jsQRRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          animFrameRef.current = requestAnimationFrame(scan);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQRRef.current(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          onScan(code.data);
        }
        animFrameRef.current = requestAnimationFrame(scan);
      };
      animFrameRef.current = requestAnimationFrame(scan);
    } catch (err: any) {
      setError(err.message || "카메라를 사용할 수 없습니다");
    }
  }, [onScan]);

  const stopScanner = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsActive(false);
  }, []);

  useEffect(() => () => stopScanner(), [stopScanner]);
  return { videoRef, canvasRef, isActive, error, startScanner, stopScanner };
}

// ── Result Screen ──
type CheckinResult = {
  success: boolean;
  alreadyCheckedIn?: boolean;
  participantName?: string;
  meetupTitle?: string;
  message?: string;
  checkedInAt?: Date | string | null;
};

function ResultOverlay({ result, onReset, autoResetMs }: {
  result: CheckinResult;
  onReset: () => void;
  autoResetMs: number;
}) {
  const [countdown, setCountdown] = useState(Math.ceil(autoResetMs / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { onReset(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onReset, autoResetMs]);

  const isSuccess = result.success && !result.alreadyCheckedIn;
  const isAlready = result.alreadyCheckedIn;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-500 ${
      isSuccess ? "bg-emerald-500" : isAlready ? "bg-amber-500" : "bg-red-500"
    }`}>
      <div className="animate-bounce mb-8">
        {isSuccess ? (
          <CheckCircle2 className="w-32 h-32 text-white" strokeWidth={1.5} />
        ) : isAlready ? (
          <AlertTriangle className="w-32 h-32 text-white" strokeWidth={1.5} />
        ) : (
          <XCircle className="w-32 h-32 text-white" strokeWidth={1.5} />
        )}
      </div>
      <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 text-center px-8">
        {isSuccess ? "체크인 완료!" : isAlready ? "이미 체크인됨" : "체크인 실패"}
      </h1>
      <p className="text-3xl md:text-4xl text-white/90 mb-2 text-center px-8">
        {result.participantName || ""}
      </p>
      {result.meetupTitle && (
        <p className="text-xl md:text-2xl text-white/70 mb-8">{result.meetupTitle}</p>
      )}
      <div className="flex items-center gap-2 text-white/60 text-lg">
        <RotateCcw className="w-5 h-5 animate-spin" />
        <span>{countdown}초 후 자동 리셋</span>
      </div>
      <Button
        onClick={onReset}
        variant="outline"
        size="lg"
        className="mt-6 text-xl px-8 py-4 bg-white/20 border-white/40 text-white hover:bg-white/30"
      >
        지금 리셋
      </Button>
    </div>
  );
}

// ── Main Kiosk Component ──
export default function KioskCheckin() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [autoResetMs, setAutoResetMs] = useState(5000);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  // Data
  const meetupsQuery = trpc.meetup.list.useQuery(undefined, { enabled: !!user });
  const statsQuery = trpc.eventCheckin.stats.useQuery(
    { meetupId: selectedMeetupId! },
    { enabled: !!selectedMeetupId, refetchInterval: 5000 }
  );
  const scanMutation = trpc.eventCheckin.scanCheckin.useMutation();

  // Extract token from QR data
  const extractToken = (data: string): string => {
    try {
      const url = new URL(data, "https://placeholder.com");
      return url.searchParams.get("token") || data;
    } catch {
      return data;
    }
  };

  // Process checkin
  const processCheckin = useCallback(async (token: string) => {
    if (isProcessing) return;
    // Debounce: same token within 3 seconds
    const now = Date.now();
    if (token === lastScannedRef.current && now - lastScanTimeRef.current < 3000) return;
    lastScannedRef.current = token;
    lastScanTimeRef.current = now;

    setIsProcessing(true);
    try {
      const res = await scanMutation.mutateAsync({
        qrToken: token,
        deviceInfo: "kiosk",
        locationNote: "키오스크 체크인",
      });
      setResult(res);
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || "체크인 처리 중 오류가 발생했습니다",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, scanMutation]);

  // QR Scanner
  const handleScan = useCallback((data: string) => {
    if (result) return; // Don't scan while showing result
    const token = extractToken(data);
    processCheckin(token);
  }, [result, processCheckin]);

  const { videoRef, canvasRef, isActive, error: scanError, startScanner, stopScanner } = useQrScanner(handleScan);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch { /* ignore */ }
  };

  // Reset after result
  const handleReset = useCallback(() => {
    setResult(null);
    lastScannedRef.current = "";
  }, []);

  // Manual token submit
  const handleManualSubmit = () => {
    if (!manualToken.trim()) return;
    processCheckin(manualToken.trim());
    setManualToken("");
  };

  // Auto-start scanner when meetup selected
  useEffect(() => {
    if (selectedMeetupId && !showSettings && !isActive) {
      startScanner();
    }
    return () => { if (!showSettings) stopScanner(); };
  }, [selectedMeetupId, showSettings]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <QrCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">로그인이 필요합니다</p>
        </div>
      </div>
    );
  }

  // ── Settings Screen ──
  if (showSettings) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <QrCode className="w-20 h-20 mx-auto mb-4 text-indigo-400" />
            <h1 className="text-3xl font-bold">키오스크 체크인</h1>
            <p className="text-gray-400 mt-2">행사 현장 QR 체크인 스캐너</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-300">밋업 선택</label>
            <Select
              value={selectedMeetupId?.toString() || ""}
              onValueChange={(v) => setSelectedMeetupId(Number(v))}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-14 text-lg">
                <SelectValue placeholder="밋업을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {meetupsQuery.data?.map((m: any) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-300">자동 리셋 시간</label>
            <Select
              value={autoResetMs.toString()}
              onValueChange={(v) => setAutoResetMs(Number(v))}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-14 text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3000">3초</SelectItem>
                <SelectItem value="5000">5초</SelectItem>
                <SelectItem value="8000">8초</SelectItem>
                <SelectItem value="10000">10초</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => { if (selectedMeetupId) setShowSettings(false); }}
            disabled={!selectedMeetupId}
            size="lg"
            className="w-full h-16 text-xl bg-indigo-600 hover:bg-indigo-700"
          >
            <Camera className="w-6 h-6 mr-2" />
            스캐너 시작
          </Button>
        </div>
      </div>
    );
  }

  // ── Scanner Screen ──
  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Result Overlay */}
      {result && (
        <ResultOverlay result={result} onReset={handleReset} autoResetMs={autoResetMs} />
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <QrCode className="w-8 h-8 text-indigo-400" />
          <div>
            <h2 className="text-lg font-bold">키오스크 체크인</h2>
            <p className="text-sm text-gray-400">
              {meetupsQuery.data?.find((m: any) => m.id === selectedMeetupId)?.title || ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statsQuery.data && (
            <Badge variant="secondary" className="text-base px-3 py-1 bg-white/10">
              <Users className="w-4 h-4 mr-1" />
              {statsQuery.data.checkedIn}/{statsQuery.data.total}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/10"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { stopScanner(); setShowSettings(true); }}
            className="text-white hover:bg-white/10"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Camera View */}
      <div className="relative w-full h-screen flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scan Frame Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-72 h-72 md:w-96 md:h-96">
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
            {/* Scanning line animation */}
            {!result && (
              <div className="absolute left-2 right-2 h-0.5 bg-indigo-400 animate-pulse"
                style={{ top: "50%", boxShadow: "0 0 8px rgba(99,102,241,0.8)" }}
              />
            )}
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30">
            <div className="flex flex-col items-center">
              <Loader2 className="w-16 h-16 text-indigo-400 animate-spin" />
              <p className="text-xl text-white mt-4">체크인 처리 중...</p>
            </div>
          </div>
        )}

        {/* Camera error */}
        {scanError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
            <div className="text-center p-8">
              <CameraOff className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <p className="text-xl text-white mb-4">{scanError}</p>
              <Button onClick={startScanner} size="lg" className="bg-indigo-600">
                다시 시도
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar - Manual Input */}
      <div className="absolute bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex gap-2 max-w-md mx-auto">
          <Input
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
            placeholder="수동 토큰 입력..."
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 h-12 text-lg"
          />
          <Button
            onClick={handleManualSubmit}
            disabled={!manualToken.trim() || isProcessing}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 h-12 px-6"
          >
            체크인
          </Button>
        </div>
        <p className="text-center text-gray-500 text-sm mt-2">
          <Clock className="w-3 h-3 inline mr-1" />
          QR 코드를 카메라에 비추세요
        </p>
      </div>
    </div>
  );
}
