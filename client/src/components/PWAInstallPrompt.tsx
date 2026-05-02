import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Share, Plus, MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInStandaloneMode(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

export default function PWAInstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (isInStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed recently
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return; // Don't show for 7 days after dismiss
    }

    // Track visit count - only show after 2+ visits
    const visitCount = parseInt(localStorage.getItem("pwa-visit-count") || "0", 10) + 1;
    localStorage.setItem("pwa-visit-count", visitCount.toString());
    if (visitCount < 2) return;

    // iOS Safari - show custom guide
    if (isIOS()) {
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android/Desktop - use beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setShowBanner(false);
    } else if (isIOS()) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (isInstalled || (!showBanner && !showIOSGuide)) return null;

  // iOS Safari Guide Modal
  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-in fade-in duration-200" onClick={handleDismiss}>
        <div 
          className="w-full max-w-md bg-card rounded-t-2xl shadow-2xl p-6 animate-in slide-in-from-bottom-8 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-foreground">
              {t("pWAInstallPrompt.iosTitle", "홈 화면에 추가하기")}
            </h3>
            <button onClick={handleDismiss} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t("pWAInstallPrompt.iosStep1", "하단의 공유 버튼을 탭하세요")}
                </p>
                <div className="mt-2 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <Share className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {t("pWAInstallPrompt.iosStep1Hint", "Safari 하단 바의 공유 아이콘")}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t("pWAInstallPrompt.iosStep2", "'홈 화면에 추가'를 선택하세요")}
                </p>
                <div className="mt-2 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <Plus className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {t("pWAInstallPrompt.iosStep2Hint", "스크롤하여 '홈 화면에 추가' 선택")}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t("pWAInstallPrompt.iosStep3", "우측 상단의 '추가'를 탭하세요")}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              {t("pWAInstallPrompt.iosNote", "설치 후 홈 화면에서 Alpha Trip 아이콘을 탭하여 앱처럼 사용할 수 있습니다.")}
            </p>
          </div>

          <Button onClick={handleDismiss} variant="outline" className="w-full mt-3">
            {t("pWAInstallPrompt.t4", "나중에")}
          </Button>
        </div>
      </div>
    );
  }

  // Android/Desktop Install Banner
  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">{t("pWAInstallPrompt.t1", "Alpha Trip 앱 설치")}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isIOS()
                ? t("pWAInstallPrompt.iosBannerDesc", "홈 화면에 추가하여 앱처럼 사용하세요")
                : t("pWAInstallPrompt.t2", "홈 화면에 추가하여 앱처럼 빠르게 접근하세요")}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={handleInstall} className="h-8 text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" />
                {isIOS()
                  ? t("pWAInstallPrompt.iosInstallBtn", "설치 방법 보기")
                  : t("pWAInstallPrompt.t3", "설치하기")}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
                {t("pWAInstallPrompt.t4", "나중에")}
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-accent transition-colors flex-shrink-0"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
