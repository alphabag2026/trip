import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
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

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after 3 seconds
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (isInstalled || !showBanner || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">Alpha Trip 앱 설치</h3>
            <p className="text-xs text-muted-foreground mt-1">
              홈 화면에 추가하여 앱처럼 빠르게 접근하세요
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={handleInstall} className="h-8 text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" />
                설치하기
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
                나중에
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
