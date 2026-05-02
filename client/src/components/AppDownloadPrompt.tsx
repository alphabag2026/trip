import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Phone, Video, Download, X, Apple, MonitorSmartphone } from "lucide-react";
import { Link } from "wouter";

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

function isInStandaloneMode(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <div className="rounded-full bg-primary/10 p-4">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg">
            {t("appDownload.modalTitle", "앱에서 이용해 주세요")}
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            {t(
              "appDownload.modalDesc",
              `${callLabel} 기능은 안정적인 이용을 위해 앱에서만 지원됩니다. Alpha Trip 앱을 설치하면 도착 안내 알림과 원활한 커뮤니케이션이 가능합니다.`
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm">{t("appDownload.benefit1", "안정적인 음성/영상 통화 (백그라운드 지원)")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <span className="text-sm">{t("appDownload.benefit2", "그룹 영상 통화 및 화면 공유")}</span>
            </div>
            <div className="flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-primary" />
              <span className="text-sm">{t("appDownload.benefit3", "실시간 푸시 알림 (도착 안내, 일정 변경)")}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            {(platform === "ios" || platform === "desktop") && (
              <Button className="w-full gap-2" onClick={() => window.open(APP_STORE_URL, "_blank")}>
                <Apple className="h-4 w-4" />
                {t("appDownload.appStore", "App Store에서 다운로드")}
              </Button>
            )}
            {(platform === "android" || platform === "desktop") && (
              <Button
                variant={platform === "desktop" ? "outline" : "default"}
                className="w-full gap-2"
                onClick={() => window.open(PLAY_STORE_URL, "_blank")}
              >
                <Download className="h-4 w-4" />
                {t("appDownload.playStore", "Google Play에서 다운로드")}
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            {t("appDownload.continueWeb", "웹에서 채팅으로 계속하기")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── 채팅방 상단 앱 안내 배너 ──
export function AppDownloadBanner({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <Smartphone className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-xs text-muted-foreground truncate">
          {t("appDownload.bannerText", "통화 및 영상통화는 앱에서 이용 가능합니다.")}
        </span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Link href="/app-install">
          <Button variant="link" size="sm" className="text-xs text-primary h-auto p-0">
            {t("appDownload.bannerLink", "앱 다운로드")}
          </Button>
        </Link>
        <button onClick={onDismiss} className="ml-2 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── 채팅방 통화 안내 배너 (하위 호환) ──
export function AppCallBanner({ onDownload }: { onDownload: () => void }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <Smartphone className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-xs text-muted-foreground truncate">
          {t("appDownload.bannerText", "통화 및 영상통화는 앱에서 이용 가능합니다.")}
        </span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="link" size="sm" className="text-xs text-primary h-auto p-0" onClick={onDownload}>
          {t("appDownload.bannerLink", "앱 다운로드")}
        </Button>
        <button onClick={() => setDismissed(true)} className="ml-2 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── 홈/마이페이지용 앱 다운로드 카드 ──
export function AppDownloadCard() {
  const { t } = useTranslation();

  // 이미 PWA로 설치된 경우 표시하지 않음
  if (isInStandaloneMode()) return null;

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
              "홈 화면에 추가하여 앱처럼 빠르게 사용하세요. 푸시 알림, 오프라인 지원, 전체 화면 모드를 이용할 수 있습니다."
            )}
          </p>
          <div className="flex gap-2 pt-2">
            <Link href="/app-install">
              <Button size="sm" className="gap-1.5">
                <Download className="h-4 w-4" />
                {t("appDownload.installGuide", "설치 가이드")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
