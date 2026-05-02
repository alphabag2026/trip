import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import {
  Smartphone,
  Monitor,
  Download,
  Share,
  Plus,
  MoreVertical,
  Check,
  ArrowLeft,
  Chrome,
  Globe,
  Wifi,
  WifiOff,
  Bell,
  Zap,
  Shield,
} from "lucide-react";
import { Link } from "wouter";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export default function AppInstallGuide() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<"android" | "ios" | "desktop">(
    isIOS() ? "ios" : isAndroid() ? "android" : "desktop"
  );

  useEffect(() => {
    if (isInStandaloneMode()) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: Zap,
      title: t("appInstall.feature1Title", "빠른 실행"),
      desc: t("appInstall.feature1Desc", "홈 화면에서 한 번의 탭으로 바로 실행"),
    },
    {
      icon: Bell,
      title: t("appInstall.feature2Title", "푸시 알림"),
      desc: t("appInstall.feature2Desc", "일정 변경, 체크인 알림을 실시간으로 수신"),
    },
    {
      icon: Globe,
      title: t("appInstall.feature3Title", "오프라인 지원"),
      desc: t("appInstall.feature3Desc", "인터넷 연결 없이도 기본 기능 사용 가능"),
    },
    {
      icon: Shield,
      title: t("appInstall.feature4Title", "전체 화면"),
      desc: t(
        "appInstall.feature4Desc",
        "브라우저 주소창 없이 앱처럼 깔끔한 화면"
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="container max-w-3xl py-8 px-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t("appInstall.backHome", "홈으로")}
            </Button>
          </Link>

          <div className="flex items-center gap-4">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/9L2UFkGMTFNGvGrFPN8jYv/alpha-trip-icon-25NAgjZMFgZ65SuCFd7Q9L.png"
              alt="Alpha Trip"
              className="w-16 h-16 rounded-2xl shadow-lg"
            />
            <div>
              <h1 className="text-2xl font-bold">Alpha Trip</h1>
              <p className="text-primary-foreground/80 text-sm mt-1">
                {t(
                  "appInstall.subtitle",
                  "행사 및 의전 자동화 플랫폼"
                )}
              </p>
            </div>
          </div>

          {isInstalled ? (
            <div className="mt-6 flex items-center gap-2 bg-primary-foreground/10 rounded-lg px-4 py-3">
              <Check className="h-5 w-5 text-green-300" />
              <span className="text-sm font-medium">
                {t("appInstall.alreadyInstalled", "이미 설치되어 있습니다!")}
              </span>
            </div>
          ) : deferredPrompt ? (
            <Button
              onClick={handleInstall}
              size="lg"
              className="mt-6 bg-white text-primary hover:bg-white/90 font-semibold gap-2"
            >
              <Download className="h-5 w-5" />
              {t("appInstall.installNow", "지금 설치하기")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="container max-w-3xl px-4 py-8">
        {/* Features */}
        <h2 className="text-lg font-bold text-foreground mb-4">
          {t("appInstall.whyInstall", "앱을 설치하면?")}
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {features.map((f, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <f.icon className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold text-sm text-foreground">
                  {f.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform Tabs */}
        <h2 className="text-lg font-bold text-foreground mb-4">
          {t("appInstall.howToInstall", "설치 방법")}
        </h2>
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab("android")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === "android"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Android
          </button>
          <button
            onClick={() => setActiveTab("ios")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === "ios"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            iOS
          </button>
          <button
            onClick={() => setActiveTab("desktop")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === "desktop"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="h-4 w-4" />
            PC
          </button>
        </div>

        {/* Android Guide */}
        {activeTab === "android" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t(
                        "appInstall.androidStep1",
                        "Chrome 브라우저에서 이 페이지를 열어주세요"
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "appInstall.androidStep1Desc",
                        "Chrome 브라우저에서만 앱 설치가 가능합니다."
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t(
                        "appInstall.androidStep2",
                        "우측 상단 메뉴(⋮)를 탭하세요"
                      )}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                      <MoreVertical className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        {t(
                          "appInstall.androidStep2Hint",
                          "Chrome 우측 상단의 점 3개 메뉴"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t(
                        "appInstall.androidStep3",
                        "'앱 설치' 또는 '홈 화면에 추가'를 선택하세요"
                      )}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                      <Download className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        {t(
                          "appInstall.androidStep3Hint",
                          "메뉴에서 '앱 설치' 또는 '홈 화면에 추가' 선택"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t("appInstall.androidDone", "설치 완료!")}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "appInstall.androidDoneDesc",
                        "홈 화면에 Alpha Trip 아이콘이 추가됩니다. 탭하여 앱처럼 사용하세요!"
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {deferredPrompt && (
              <Button
                onClick={handleInstall}
                size="lg"
                className="w-full gap-2 font-semibold"
              >
                <Download className="h-5 w-5" />
                {t("appInstall.installNow", "지금 설치하기")}
              </Button>
            )}
          </div>
        )}

        {/* iOS Guide */}
        {activeTab === "ios" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t(
                        "appInstall.iosStep1",
                        "Safari 브라우저에서 이 페이지를 열어주세요"
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "appInstall.iosStep1Desc",
                        "Safari에서만 홈 화면 추가가 가능합니다. Chrome이나 다른 브라우저에서는 지원되지 않습니다."
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t(
                        "appInstall.iosStep2",
                        "하단의 공유 버튼을 탭하세요"
                      )}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                      <Share className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        {t(
                          "appInstall.iosStep2Hint",
                          "Safari 하단 바의 공유 아이콘 (사각형에 위쪽 화살표)"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t(
                        "appInstall.iosStep3",
                        "'홈 화면에 추가'를 선택하세요"
                      )}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                      <Plus className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        {t(
                          "appInstall.iosStep3Hint",
                          "공유 메뉴에서 아래로 스크롤하여 '홈 화면에 추가' 선택"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t(
                        "appInstall.iosStep4",
                        "우측 상단의 '추가'를 탭하세요"
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "appInstall.iosStep4Desc",
                        "앱 이름을 확인하고 '추가' 버튼을 탭합니다."
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t("appInstall.iosDone", "설치 완료!")}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "appInstall.iosDoneDesc",
                        "홈 화면에 Alpha Trip 아이콘이 추가됩니다. 탭하여 앱처럼 사용하세요!"
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Desktop Guide */}
        {activeTab === "desktop" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t(
                        "appInstall.desktopStep1",
                        "Chrome 또는 Edge 브라우저에서 이 페이지를 열어주세요"
                      )}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t(
                        "appInstall.desktopStep2",
                        "주소창 우측의 설치 아이콘을 클릭하세요"
                      )}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                      <Download className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        {t(
                          "appInstall.desktopStep2Hint",
                          "주소창 오른쪽에 모니터+화살표 아이콘이 표시됩니다"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t(
                        "appInstall.desktopStep3",
                        "'설치' 버튼을 클릭하세요"
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "appInstall.desktopStep3Desc",
                        "팝업에서 '설치'를 클릭하면 데스크톱 앱으로 설치됩니다."
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t("appInstall.desktopDone", "설치 완료!")}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "appInstall.desktopDoneDesc",
                        "바탕화면 또는 앱 목록에서 Alpha Trip을 실행할 수 있습니다."
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {deferredPrompt && (
              <Button
                onClick={handleInstall}
                size="lg"
                className="w-full gap-2 font-semibold"
              >
                <Download className="h-5 w-5" />
                {t("appInstall.installNow", "지금 설치하기")}
              </Button>
            )}
          </div>
        )}

        {/* FAQ */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-foreground mb-4">
            {t("appInstall.faqTitle", "자주 묻는 질문")}
          </h2>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm text-foreground">
                  {t(
                    "appInstall.faq1Q",
                    "앱 스토어에서 다운로드하는 것과 다른가요?"
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(
                    "appInstall.faq1A",
                    "Alpha Trip은 PWA(Progressive Web App)로, 앱 스토어 없이 웹 브라우저에서 바로 설치할 수 있습니다. 네이티브 앱과 동일한 사용 경험을 제공하며, 저장 공간도 적게 사용합니다."
                  )}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm text-foreground">
                  {t("appInstall.faq2Q", "삭제는 어떻게 하나요?")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(
                    "appInstall.faq2A",
                    "일반 앱과 동일하게 아이콘을 길게 눌러 삭제하거나, 설정 > 앱에서 제거할 수 있습니다."
                  )}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm text-foreground">
                  {t("appInstall.faq3Q", "데이터 사용량이 많나요?")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(
                    "appInstall.faq3A",
                    "처음 설치 시 약 5MB 정도의 데이터만 사용하며, 이후에는 캐시된 데이터로 빠르게 로딩됩니다."
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
