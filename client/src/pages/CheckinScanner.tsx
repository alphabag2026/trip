import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  QrCode, Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle,
  ArrowLeft, Search, UserCheck, Clock, Loader2
} from "lucide-react";

// Simple QR scanner using getUserMedia + jsQR
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
      // Dynamically import jsQR
      if (!jsQRRef.current) {
        const mod = await import("jsqr");
        jsQRRef.current = mod.default || mod;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
    } catch (err: any) {
      setError(err.message || "카메라 접근 실패");
      setIsActive(false);
    }
  }, []);

  const stopScanner = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let scanning = true;
    const scan = () => {
      if (!scanning || !video.videoWidth) {
        animFrameRef.current = requestAnimationFrame(scan);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const jsQR = jsQRRef.current;
      if (jsQR) {
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code?.data) {
          onScan(code.data);
          scanning = false;
          return;
        }
      }
      animFrameRef.current = requestAnimationFrame(scan);
    };
    animFrameRef.current = requestAnimationFrame(scan);

    return () => {
      scanning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, onScan]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  return { videoRef, canvasRef, isActive, error, startScanner, stopScanner };
}

type CheckinResult = {
  success: boolean;
  alreadyCheckedIn: boolean;
  participantName: string;
  meetupTitle?: string;
  checkedInAt?: Date | null;
  message: string;
};

export default function CheckinScanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [manualToken, setManualToken] = useState("");
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [recentScans, setRecentScans] = useState<CheckinResult[]>([]);

  // URL에서 토큰 파라미터 확인
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get("token");

  const scanCheckin = trpc.eventCheckin.scanCheckin.useMutation({
    onSuccess: (result) => {
      setLastResult(result as CheckinResult);
      setRecentScans(prev => [result as CheckinResult, ...prev.slice(0, 9)]);
      if (result.success) {
        setScanCount(c => c + 1);
        toast.success(`${result.participantName} 체크인 완료!`);
      } else {
        toast.warning(result.message);
      }
      setIsProcessing(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsProcessing(false);
      setLastResult({ success: false, alreadyCheckedIn: false, participantName: "", message: err.message });
    },
  });

  const handleScan = useCallback((data: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    // URL에서 토큰 추출
    let token = data;
    try {
      const url = new URL(data, window.location.origin);
      const t = url.searchParams.get("token");
      if (t) token = t;
    } catch { /* raw token */ }
    scanCheckin.mutate({
      qrToken: token,
      deviceInfo: navigator.userAgent.substring(0, 200),
    });
  }, [isProcessing, scanCheckin]);

  const { videoRef, canvasRef, isActive, error: cameraError, startScanner, stopScanner } = useQrScanner(handleScan);

  // URL 토큰이 있으면 자동 체크인
  useEffect(() => {
    if (urlToken && !isProcessing && !lastResult) {
      setIsProcessing(true);
      scanCheckin.mutate({
        qrToken: urlToken,
        deviceInfo: navigator.userAgent.substring(0, 200),
      });
    }
  }, [urlToken]);

  const handleManualSubmit = () => {
    if (!manualToken.trim()) return;
    handleScan(manualToken.trim());
    setManualToken("");
  };

  const resetScanner = () => {
    setLastResult(null);
    setIsProcessing(false);
    if (!isActive) startScanner();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">로그인이 필요합니다</h2>
            <p className="text-muted-foreground mb-4">체크인 스캐너를 사용하려면 먼저 로그인해주세요.</p>
            <Button onClick={() => navigate("/")}>홈으로 이동</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center gap-3 h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1 as any)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <QrCode className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg">QR 체크인 스캐너</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              {scanCount}명 체크인
            </Badge>
          </div>
        </div>
      </div>

      <div className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Camera Scanner */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="w-4 h-4" />
              카메라 스캔
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isActive ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <CameraOff className="w-10 h-10 text-muted-foreground" />
                </div>
                {cameraError && (
                  <p className="text-sm text-destructive mb-3">{cameraError}</p>
                )}
                <Button onClick={startScanner} size="lg" className="gap-2">
                  <Camera className="w-5 h-5" />
                  카메라 시작
                </Button>
              </div>
            ) : (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-primary rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                    {isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={stopScanner}
                >
                  <CameraOff className="w-4 h-4 mr-1" />
                  중지
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" />
              수동 입력
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="QR 토큰 또는 URL 입력..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit} disabled={isProcessing || !manualToken.trim()}>
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "확인"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Last Result */}
        {lastResult && (
          <Card className={`border-2 ${lastResult.success ? "border-green-500 bg-green-50 dark:bg-green-950/20" : lastResult.alreadyCheckedIn ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"}`}>
            <CardContent className="pt-6">
              <div className="text-center">
                {lastResult.success ? (
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                ) : lastResult.alreadyCheckedIn ? (
                  <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-3" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
                )}
                <h3 className="text-xl font-bold mb-1">{lastResult.message}</h3>
                {lastResult.participantName && (
                  <p className="text-lg font-semibold">{lastResult.participantName}</p>
                )}
                {lastResult.meetupTitle && (
                  <p className="text-sm text-muted-foreground mt-1">{lastResult.meetupTitle}</p>
                )}
                {lastResult.checkedInAt && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(lastResult.checkedInAt).toLocaleString()}
                  </p>
                )}
                <Button onClick={resetScanner} className="mt-4 gap-2">
                  <QrCode className="w-4 h-4" />
                  다음 스캔
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                최근 스캔 기록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentScans.map((scan, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                    {scan.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : scan.alreadyCheckedIn ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{scan.participantName || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{scan.message}</p>
                    </div>
                    {scan.checkedInAt && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(scan.checkedInAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
