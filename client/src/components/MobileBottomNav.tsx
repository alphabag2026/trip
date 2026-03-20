import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Globe, ClipboardList, Search, LayoutDashboard, User,
  UserPlus, LogIn
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";

/**
 * 모바일 하단 네비게이션 바
 * - 모든 public 페이지에서 항상 표시 (admin 페이지 제외)
 * - md 이상에서는 숨김
 * - 현재 경로에 따라 활성 상태 표시
 */
export default function MobileBottomNav() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [location] = useLocation();

  // admin 페이지에서는 표시하지 않음
  if (location.startsWith("/admin")) return null;

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const activeClass = "text-primary";
  const inactiveClass = "text-muted-foreground hover:text-primary";

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50">
      <div className="flex justify-around py-2">
        {isAuthenticated ? (
          <>
            <Link href="/" className={`flex flex-col items-center gap-1 p-2 text-xs ${isActive("/") ? activeClass : inactiveClass}`}>
              <Globe className="h-5 w-5" /><span>{t("nav.home")}</span>
            </Link>
            <Link href="/register" className={`flex flex-col items-center gap-1 p-2 text-xs ${isActive("/register") ? activeClass : inactiveClass}`}>
              <ClipboardList className="h-5 w-5" /><span>{t("nav.apply")}</span>
            </Link>
            <Link href="/lookup" className={`flex flex-col items-center gap-1 p-2 text-xs ${isActive("/lookup") ? activeClass : inactiveClass}`}>
              <Search className="h-5 w-5" /><span>{t("nav.search")}</span>
            </Link>
            <Link href="/dashboard" className={`flex flex-col items-center gap-1 p-2 text-xs ${isActive("/dashboard") ? activeClass : inactiveClass}`}>
              <LayoutDashboard className="h-5 w-5" /><span>{t("nav.dashboard")}</span>
            </Link>
            <Link href="/my-page" className={`flex flex-col items-center gap-1 p-2 text-xs ${isActive("/my-page") ? activeClass : inactiveClass}`}>
              <User className="h-5 w-5" /><span>{t("nav.myProfile")}</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/" className={`flex flex-col items-center gap-1 p-2 text-xs ${isActive("/") ? activeClass : inactiveClass}`}>
              <Globe className="h-5 w-5" /><span>{t("nav.home")}</span>
            </Link>
            <a href="#features" className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
              <Search className="h-5 w-5" /><span>{t("nav.features")}</span>
            </a>
            <a href={getLoginUrl("/onboarding")} className="flex flex-col items-center gap-1 p-2 text-xs text-primary font-semibold">
              <UserPlus className="h-5 w-5" /><span>{t("nav.signup")}</span>
            </a>
            <a href={getLoginUrl()} className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground hover:text-primary">
              <LogIn className="h-5 w-5" /><span>{t("nav.login")}</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
