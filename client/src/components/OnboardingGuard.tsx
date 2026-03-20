import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * 온보딩 가드: 인증된 사용자가 온보딩을 완료하지 않았으면 /onboarding으로 리다이렉트
 * 예외 경로: /, /onboarding, /admin/*, /invite/* (이 경로들은 온보딩 없이 접근 가능)
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // 온보딩 상태 조회 (인증된 사용자만)
  const { data: onboardingStatus, isLoading: statusLoading } = trpc.userProfile.onboardingStatus.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    // 아직 로딩 중이면 대기
    if (authLoading || statusLoading) return;
    // 인증되지 않은 사용자는 무시
    if (!isAuthenticated || !user) return;
    // 관리자/슈퍼관리자는 온보딩 불필요
    if (user.role === "admin" || user.role === "superadmin") return;
    // 홈 페이지는 항상 접근 가능 (소개 화면)
    if (location === "/") return;
    // 이미 온보딩 페이지에 있으면 무시
    if (location === "/onboarding") return;
    // admin 경로는 무시
    if (location.startsWith("/admin")) return;
    // 초대 수락 경로는 무시
    if (location.startsWith("/invite")) return;

    // 온보딩 미완료 시 리다이렉트
    if (onboardingStatus && !onboardingStatus.onboardingCompleted) {
      setLocation("/onboarding");
    }
  }, [authLoading, statusLoading, isAuthenticated, user, onboardingStatus, location, setLocation]);

  return <>{children}</>;
}
