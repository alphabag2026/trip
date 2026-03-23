import { useAuth } from "@/_core/hooks/useAuth";
import {
  Globe, ClipboardList, Bot, User,
  UserPlus, LogIn, Home as HomeIcon
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";

/**
 * 모바일 하단 네비게이션 바
 * - 핵심 4개 탭: 홈, 밋업 신청, AI 도우미, 마이페이지
 * - md 이상에서는 숨김
 * - admin 페이지에서는 표시하지 않음
 */
export default function MobileBottomNav() {
  const { user, isAuthenticated } = useAuth();
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

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around py-1.5">
        {isAuthenticated ? (
          <>
            <Link href="/" className={`flex flex-col items-center gap-0.5 p-1.5 text-[10px] font-medium ${isActive("/") ? activeClass : inactiveClass}`}>
              <HomeIcon className="h-5 w-5" />
              <span>{t("nav.home")}</span>
            </Link>
            <Link href="/register" className={`flex flex-col items-center gap-0.5 p-1.5 text-[10px] font-medium ${isActive("/register") ? activeClass : inactiveClass}`}>
              <ClipboardList className="h-5 w-5" />
              <span>{t("nav.apply")}</span>
            </Link>
            <Link href="/chatbot" className={`flex flex-col items-center gap-0.5 p-1.5 text-[10px] font-medium ${isActive("/chatbot") ? activeClass : inactiveClass}`}>
              <Bot className="h-5 w-5" />
              <span>{t("nav.ai", "AI")}</span>
            </Link>
            <Link href="/my-page" className={`flex flex-col items-center gap-0.5 p-1.5 text-[10px] font-medium ${isActive("/my-page") ? activeClass : inactiveClass}`}>
              <User className="h-5 w-5" />
              <span>{t("nav.myProfile")}</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/" className={`flex flex-col items-center gap-0.5 p-1.5 text-[10px] font-medium ${isActive("/") ? activeClass : inactiveClass}`}>
              <Globe className="h-5 w-5" />
              <span>{t("nav.home")}</span>
            </Link>
            <a href="#features" className="flex flex-col items-center gap-0.5 p-1.5 text-[10px] font-medium text-muted-foreground">
              <Bot className="h-5 w-5" />
              <span>{t("nav.features")}</span>
            </a>
            <Link href="/login?tab=register" className="flex flex-col items-center gap-0.5 p-1.5 text-[10px] font-medium text-primary">
              <UserPlus className="h-5 w-5" />
              <span>{t("nav.signup")}</span>
            </Link>
            <Link href="/login" className="flex flex-col items-center gap-0.5 p-1.5 text-[10px] font-medium text-muted-foreground">
              <LogIn className="h-5 w-5" />
              <span>{t("nav.login")}</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
