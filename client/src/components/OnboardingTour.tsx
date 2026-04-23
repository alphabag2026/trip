import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  User, BookOpen, Calendar, MessageCircle, Map, Shield, Sparkles,
  ArrowRight, ArrowLeft, X, CheckCircle2
} from "lucide-react";

interface TourStep {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  titleDefault: string;
  descKey: string;
  descDefault: string;
  targetSelector?: string;
  position?: "top" | "bottom" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    icon: <Sparkles className="w-8 h-8 text-amber-400" />,
    titleKey: "tour.welcomeTitle",
    titleDefault: "Alpha Trip에 오신 것을 환영합니다!",
    descKey: "tour.welcomeDesc",
    descDefault: "밋업과 출장을 한 곳에서 관리하세요. 주요 기능을 빠르게 안내해 드리겠습니다.",
    position: "center",
  },
  {
    id: "profile",
    icon: <User className="w-8 h-8 text-blue-400" />,
    titleKey: "tour.profileTitle",
    titleDefault: "프로필 설정",
    descKey: "tour.profileDesc",
    descDefault: "전화번호, 소속, 비상연락처 등 기본 정보를 입력하세요. 밋업 신청 시 자동으로 입력됩니다.",
    targetSelector: "[data-tour='profile']",
    position: "bottom",
  },
  {
    id: "passport",
    icon: <BookOpen className="w-8 h-8 text-emerald-400" />,
    titleKey: "tour.passportTitle",
    titleDefault: "여권 등록",
    descKey: "tour.passportDesc",
    descDefault: "여권 사진을 촬영하면 AI가 자동으로 정보를 인식합니다. 출입국과 호텔 체크인에 활용됩니다.",
    targetSelector: "[data-tour='passport']",
    position: "bottom",
  },
  {
    id: "meetup",
    icon: <Calendar className="w-8 h-8 text-violet-400" />,
    titleKey: "tour.meetupTitle",
    titleDefault: "밋업 참가",
    descKey: "tour.meetupDesc",
    descDefault: "초대받은 밋업에 참가 신청하고, 일정/항공/숙박 정보를 한 눈에 확인하세요.",
    targetSelector: "[data-tour='meetup']",
    position: "bottom",
  },
  {
    id: "chat",
    icon: <MessageCircle className="w-8 h-8 text-cyan-400" />,
    titleKey: "tour.chatTitle",
    titleDefault: "실시간 채팅",
    descKey: "tour.chatDesc",
    descDefault: "참가자들과 실시간으로 소통하세요. AI가 문구를 다듬어주고, 자동 답장도 제안합니다.",
    targetSelector: "[data-tour='chat']",
    position: "bottom",
  },
  {
    id: "nearby",
    icon: <Map className="w-8 h-8 text-orange-400" />,
    titleKey: "tour.nearbyTitle",
    titleDefault: "주변 탐색",
    descKey: "tour.nearbyDesc",
    descDefault: "현지 맛집, 카페, 관광지를 지도에서 바로 찾아보세요. 즐겨찾기도 가능합니다.",
    targetSelector: "[data-tour='nearby']",
    position: "bottom",
  },
  {
    id: "safety",
    icon: <Shield className="w-8 h-8 text-red-400" />,
    titleKey: "tour.safetyTitle",
    titleDefault: "안전 & SOS",
    descKey: "tour.safetyDesc",
    descDefault: "긴급 상황 시 SOS 버튼으로 관리자에게 즉시 알림을 보낼 수 있습니다. 비상연락처도 등록하세요.",
    targetSelector: "[data-tour='safety']",
    position: "bottom",
  },
  {
    id: "complete",
    icon: <CheckCircle2 className="w-8 h-8 text-green-400" />,
    titleKey: "tour.completeTitle",
    titleDefault: "준비 완료!",
    descKey: "tour.completeDesc",
    descDefault: "이제 Alpha Trip의 모든 기능을 자유롭게 이용하세요. 프로필 설정부터 시작해 보세요!",
    position: "center",
  },
];

const TOUR_STORAGE_KEY = "alphatrip_tour_completed";

export function OnboardingTour() {
  const { t } = useTranslation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // 첫 로그인 감지
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      // 약간의 딜레이 후 투어 시작 (페이지 로딩 완료 대기)
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // 타겟 요소 위치 추적
  useEffect(() => {
    if (!isActive) return;
    const step = TOUR_STEPS[currentStep];
    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsActive(false);
    setCurrentStep(0);
  }, []);

  const handleSkip = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsActive(false);
  }, []);

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  const isCenter = step.position === "center" || !targetRect;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] transition-all duration-300"
      onClick={(e) => {
        if (e.target === overlayRef.current) handleNext();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Spotlight on target element */}
      {targetRect && !isCenter && (
        <div
          className="absolute rounded-xl transition-all duration-500 ease-out"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6), 0 0 30px 4px rgba(99,102,241,0.4)",
            border: "2px solid rgba(99,102,241,0.6)",
          }}
        />
      )}

      {/* Tour Card */}
      <div
        className={`absolute transition-all duration-500 ease-out ${
          isCenter
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            : step.position === "top"
            ? "bottom-4 left-1/2 -translate-x-1/2"
            : "top-auto left-1/2 -translate-x-1/2"
        }`}
        style={
          !isCenter && targetRect
            ? {
                top:
                  step.position === "bottom"
                    ? Math.min(targetRect.bottom + 20, window.innerHeight - 260)
                    : undefined,
                bottom: step.position === "top" ? window.innerHeight - targetRect.top + 20 : undefined,
              }
            : undefined
        }
      >
        <Card className="w-[340px] sm:w-[400px] border-indigo-500/30 bg-background/95 backdrop-blur-md shadow-2xl shadow-indigo-500/10">
          <CardContent className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
                  {step.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">
                    {t(step.titleKey, step.titleDefault)}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {currentStep + 1} / {TOUR_STEPS.length}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(step.descKey, step.descDefault)}
            </p>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                {t("tour.skip", "건너뛰기")}
              </Button>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" size="sm" onClick={handlePrev}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    {t("tour.prev", "이전")}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white"
                >
                  {currentStep < TOUR_STEPS.length - 1
                    ? t("tour.next", "다음")
                    : t("tour.getStarted", "시작하기")}
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * 투어를 수동으로 다시 시작하는 함수
 * 설정 페이지 등에서 호출 가능
 */
export function resetOnboardingTour() {
  localStorage.removeItem(TOUR_STORAGE_KEY);
}
