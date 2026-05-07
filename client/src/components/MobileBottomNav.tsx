import { useAuth } from "@/_core/hooks/useAuth";
import {
  Home as HomeIcon, CalendarDays, MessageCircle, Bot, User, LogIn
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";

/**
 * 모바일 하단 네비게이션 바
 * - 5개 탭: 홈, 일정, 채팅, AI 도우미, 나의 정보
 * - md 이상에서는 숨김
 * - admin 페이지에서는 표시하지 않음
 */
export default function MobileBottomNav() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [location] = useLocation();

  // admin, login, welcome 페이지에서는 표시하지 않음
  if (location.startsWith("/admin") || location === "/login" || location === "/welcome") return null;

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const activeClass = "text-primary";
  const inactiveClass = "text-muted-foreground";

  // 로그인/비로그인 공통 5개 탭 (비로그인 시 마지막은 로그인 버튼)
  const tabs = isAuthenticated
    ? [
        { icon: HomeIcon, label: t("nav.home", "홈"), href: "/" },
        { icon: CalendarDays, label: t("nav.schedule", "일정"), href: "/schedule" },
        { icon: MessageCircle, label: t("nav.chat", "채팅"), href: "/community" },
        { icon: Bot, label: t("nav.ai", "AI 도우미"), href: "/chatbot" },
        { icon: User, label: t("nav.mypage", "나의 정보"), href: "/my-page" },
      ]
    : [
        { icon: HomeIcon, label: t("nav.home", "홈"), href: "/" },
        { icon: CalendarDays, label: t("nav.schedule", "일정"), href: "/schedule" },
        { icon: MessageCircle, label: t("nav.chat", "채팅"), href: "/community" },
        { icon: Bot, label: t("nav.ai", "AI 도우미"), href: "/chatbot" },
        { icon: LogIn, label: t("nav.login", "로그인"), href: "/login" },
      ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around py-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 p-1.5 text-[10px] font-medium ${
              isActive(tab.href) ? activeClass : inactiveClass
            }`}
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
