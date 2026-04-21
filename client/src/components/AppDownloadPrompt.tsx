import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Phone, Video, Download, X, Apple, MonitorSmartphone } from "lucide-react";

// ── 앱 스토어 URL (추후 실제 URL로 교체) ──
const APP_STORE_URL = "https://apps.apple.com/app/alpha-trip/id0000000000";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.alphatrip.app";

/** 모바일 디바이스 감지 */
function detectPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent || navigator.vendor || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

// ── 앱 다운로드 유도 모달 (통화 시도 시 표시) ──
export function AppDownloadModal({
  open,
  onOpenChange,
  callType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callType?: "voice" | "video" | "group";
}) {
  const { t } = useTranslation();
  const platform = detectPlatform();

  const callLabel =
    callType === "video"
      ? t("appDownload.videoCall", "영상 통화")
      : callType === "group"
        ? t("appDownload.groupCall", "그룹 통화")
        : t("appDownload.voiceCall", "음성 통화");

  const handleDownload = () => {
    if (platform === "ios") {
      window.open(APP_STORE_URL, "_blank");
    } else if (platform === "android") {
      window.open(PLAY_STORE_URL, "_blank");
    } else {
      // 데스크톱: 두 스토어 모두 표시
      window.open(PLAY_STORE_URL, "_blank");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-primary" />
            {t("appDownload.modalTitle", "앱에서 이용해 주세요")}
          </DialogTitle>
          <DialogDescription className="text-left">
            {t(
              "appDownload.modalDesc",
              "{{callLabel}} 기능은 앱에서만 안정적으로 이용할 수 있습니다. 고객 도착 안내 및 원활한 통신을 위해 Alpha Trip 앱을 설치해 주세요.",
              { callLabel }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* 앱 장점 안내 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2.5">
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm">{t("appDownload.benefit1", "안정적인 음성/영상 통화 (백그라운드 지원)")}</span>
            </div>
            <div className="flex items-start gap-3">
              <Video className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm">{t("appDownload.benefit2", "그룹 영상 통화 및 화면 공유")}</span>
            </div>
            <div className="flex items-start gap-3">
              <MonitorSmartphone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm">{t("appDownload.benefit3", "실시간 푸시 알림 (도착 안내, 일정 변경)")}</span>
            </div>
          </div>

          {/* 다운로드 버튼 */}
          <div className="flex flex-col gap-2">
            {(platform === "ios" || platform === "desktop") && (
              <Button onClick={() => window.open(APP_STORE_URL, "_blank")} className="w-full gap-2" size="lg">
                <Apple className="h-5 w-5" />
                {t("appDownload.appStore", "App Store에서 다운로드")}
              </Button>
            )}
            {(platform === "android" || platform === "desktop") && (
              <Button
                onClick={() => window.open(PLAY_STORE_URL, "_blank")}
                className="w-full gap-2"
                size="lg"
                variant={platform === "desktop" ? "outline" : "default"}
              >
                <Download className="h-5 w-5" />
                {t("appDownload.playStore", "Google Play에서 다운로드")}
              </Button>
            )}
          </div>

          {/* 웹에서 계속 (채팅만) */}
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => onOpenChange(false)}>
            {t("appDownload.continueWeb", "웹에서 채팅으로 계속하기")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── 채팅방 상단 앱 다운로드 안내 배너 ──
export function AppCallBanner({ onDownload }: { onDownload?: () => void }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  // 세션 내에서 한 번 닫으면 유지
  useEffect(() => {
    const v = sessionStorage.getItem("app-banner-dismissed");
    if (v === "1") setDismissed(true);
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("app-banner-dismissed", "1");
  };

  const platform = detectPlatform();
  const storeUrl = platform === "ios" ? APP_STORE_URL : PLAY_STORE_URL;

  return (
    <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/10 flex items-center gap-3">
      <Smartphone className="h-4 w-4 text-primary shrink-0" />
      <p className="text-xs text-primary flex-1">
        {t("appDownload.bannerText", "통화 및 영상통화는 앱에서 이용 가능합니다.")}
        <button
          className="ml-1 underline font-medium"
          onClick={() => {
            if (onDownload) onDownload();
            else window.open(storeUrl, "_blank");
          }}
        >
          {t("appDownload.bannerLink", "앱 다운로드")}
        </button>
      </p>
      <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── 홈/마이페이지용 앱 다운로드 카드 ──
export function AppDownloadCard() {
  const { t } = useTranslation();
  const platform = detectPlatform();

  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-primary/10 p-3">
          <Smartphone className="h-7 w-7 text-primary" />
        </div>
        <div className="flex-1 space-y-1.5">
          <h3 className="font-semibold text-base">
            {t("appDownload.cardTitle", "Alpha Trip 앱 설치")}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(
              "appDownload.cardDesc",
              "고객 도착 안내 및 실시간 통신을 위해 앱을 설치해 주세요. 음성/영상 통화, 푸시 알림, 위치 공유 등 모든 기능을 이용할 수 있습니다."
            )}
          </p>
          <div className="flex gap-2 pt-2">
            {(platform === "ios" || platform === "desktop") && (
              <Button size="sm" className="gap-1.5" onClick={() => window.open(APP_STORE_URL, "_blank")}>
                <Apple className="h-4 w-4" /> App Store
              </Button>
            )}
            {(platform === "android" || platform === "desktop") && (
              <Button
                size="sm"
                variant={platform === "desktop" ? "outline" : "default"}
                className="gap-1.5"
                onClick={() => window.open(PLAY_STORE_URL, "_blank")}
              >
                <Download className="h-4 w-4" /> Google Play
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
